
'use server';

/**
 * @fileOverview A Genkit flow for processing raw text into structured lesson or test content,
 * potentially augmented by information from a knowledge base.
 *
 * - processContent - A function that handles the content creation process.
 * - ProcessContentInput - The input type for the function.
 * - ProcessContentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';
import { generateAudioFromText } from './text-to-speech-flow';
import { generateLessonImage } from './generate-lesson-image-flow';
import { uploadAudioToStorage, uploadImageToStorage } from '@/lib/firebase/storage';
import { getFirebaseAdmin } from '@/firebase/admin';

const ProcessContentInputSchema = z.object({
  contentType: z.enum(['Lesson', 'ReadingTest', 'ListeningTest', 'WritingTest', 'SpeakingPrompt']),
  rawText: z.string().describe('The raw text content or topic to be processed.'),
});
export type ProcessContentInput = z.infer<typeof ProcessContentInputSchema>;

const PracticeQuestionSchema = z.object({
  id: z.string().describe("A unique ID for the question (e.g., q1, q2)."),
  question: z.string().describe("The question text."),
  type: z.enum(["multiple-choice", "true-false-not-given", "fill-in-the-blank"]).describe("The type of question."),
  options: z.array(z.string()).optional().describe("A list of options for multiple-choice questions."),
  answer: z.string().describe("The correct answer to the question."),
});

const GrammarTableRowSchema = z.object({
    subject: z.string(),
    verb: z.string(),
});

const ContentBlockSchema = z.object({
    type: z.enum(['explanation', 'example', 'tip', 'image_placeholder', 'grammar_table', 'example_list']),
    sectionTitle: z.string().optional().describe("A title for this block, e.g., 'A', 'B', 'Study this example situation'"),
    content: z.string().optional().describe("The text content for this block."),
    imageHint: z.string().optional().describe("A 1-2 word hint for finding an image. MUST be derived from the concrete subject and action of the content, not abstract grammar rules."),
    generatedImageUrl: z.string().url().optional().describe("The URL of the AI-generated image for this block."),
    tableRows: z.array(GrammarTableRowSchema).optional().describe("An array of structured grammar table rows."),
    examples: z.array(z.string()).optional().describe("An array of example sentences for a list."),
});


const LessonSchema = z.object({
  id: z.string().describe("A unique ID for the lesson, e.g., VOCAB_u5t9, SPEAKING_a4f8."),
  type: z.enum(['Grammar', 'Vocabulary', 'Tips', 'Speaking']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels', "Part 1", "Part 2", "Part 3"]),
  content_en: z.string().describe("A brief, one-sentence summary of the lesson's content."),
  contentBlocks: z.array(ContentBlockSchema).describe("An array of structured content blocks that make up the lesson."),
});

const ReadingTestSchema = z.object({
  id: z.string().describe("A unique ID for the test, e.g., R_AC_x7y2."),
  title: z.string(),
  skill: z.enum(["Reading"]),
  passage: z.string(),
  questions: z.array(PracticeQuestionSchema),
});

const ListeningTestSchema = z.object({
    id: z.string().describe("A unique ID for the test, e.g., L_AC_p9q3."),
    title: z.string(),
    skill: z.enum(["Listening"]),
    audioUrl: z.string().url().describe("A placeholder URL. This will be replaced by the real URL after upload."),
    transcript: z.string().describe("The full transcript of the audio."),
    questions: z.array(PracticeQuestionSchema),
});

const WritingTestSchema = z.object({
    id: z.string().describe("A unique ID for the test, e.g., IELTS_Writing_z1w5."),
    testType: z.enum(["IELTS-Academic", "IELTS-General", "PTE"]),
    skill: z.enum(["Writing"]),
    questions: z.array(z.object({
        task: z.number(),
        topic: z.string(),
        taskType: z.enum(["Task 1", "Task 2"]),
        wordCountTarget: z.number(),
    })),
});


const ProcessContentOutputSchema = z.union([
    LessonSchema,
    ReadingTestSchema,
    ListeningTestSchema,
    WritingTestSchema,
]);
export type ProcessContentOutput = z.infer<typeof ProcessContentOutputSchema>;


export async function processContent(
  input: ProcessContentInput
): Promise<ProcessContentOutput> {
  return contentFactoryFlow(input);
}


const prompt = ai.definePrompt({
  name: 'contentFactoryPrompt',
  input: { schema: z.object({
    contentType: ProcessContentInputSchema.shape.contentType,
    rawText: ProcessContentInputSchema.shape.rawText,
    knowledge: z.string().optional().describe("Relevant information retrieved from the knowledge base."),
  }) },
  output: { schema: ProcessContentOutputSchema },
  prompt: `Role: You are an expert ESL Curriculum Designer mimicking the pedagogical style of "English Grammar in Use" (Raymond Murphy).

  Input: A grammar topic (e.g., "Unit 2 Present Simple (I do)").
  
  Task: Generate a complete, structured lesson for the given topic. You must invent high-quality, simple, and clear examples and exercises. The output must be valid JSON only. Do not write markdown or conversational text.

  The user has specified that the desired content type is '{{{contentType}}}'. You must adhere to the corresponding output schema.

  **If the 'contentType' is 'Lesson' and the 'rawText' is a short topic (like "The Verb System"), you MUST EXPAND it into a full lesson following these structure requirements:**
  
  Structure Requirements:
  1.  **Concept Context (Section A):** Create a short scenario introducing the grammar point. Format this as an 'image_placeholder' content block. The 'content' field should contain the example sentence, and you must generate a 'imageHint' that describes the visual scene.
  2.  **The Rules (Section B):** Explain when to use the tense (e.g., "general truths," "habits") using 'explanation' and 'example_list' content blocks.
  3.  **Grammar Table (Section C):** Create a 'grammar_table' content block showing Positive, Negative, and Question forms.
  4.  **Exercises (Right Page):** Generate at least three distinct 'explanation' blocks for exercises, each with a clear title (e.g., 'Exercise 1: Fill in the blank'). Do not generate the answers.

  **If the 'rawText' is already detailed content, reformat it to fit this structured model.**

  **General Rules:**
  - Generate a completely new, unique 'id' for the content.
  - Break down the content into logical 'contentBlocks'.
  - The main 'content_en' field should be a very short, one-sentence summary of the entire lesson.
  
  ---
  SCHEMAS:
  - Lesson Schema: ${JSON.stringify(LessonSchema.shape)}
  - WritingTest Schema: ${JSON.stringify(WritingTestSchema.shape)}
  - ReadingTest Schema: ${JSON.stringify(ReadingTestSchema.shape)}
  - ListeningTest Schema: ${JSON.stringify(ListeningTestSchema.shape)}

  ---
  Knowledge Base Context (if available):
  {{{knowledge}}}
  ---
  Raw Text to Process:
  {{{rawText}}}
  ---
`,
  config: {
    temperature: 0.7,
  }
});


const contentFactoryFlow = ai.defineFlow(
  {
    name: 'contentFactoryFlow',
    inputSchema: ProcessContentInputSchema,
    outputSchema: ProcessContentOutputSchema,
  },
  async (input) => {
    const firestore = (await getFirebaseAdmin()).firestore();
    // 1. Retrieve relevant knowledge from Firestore
    console.log("Searching knowledge base...");
    let knowledge = '';
    try {
        const knowledgeQuery = await firestore.collection('knowledge')
            .limit(5)
            .get(); 

        if (!knowledgeQuery.empty) {
            knowledge = knowledgeQuery.docs.map(doc => doc.data().chunk).join('\n\n---\n\n');
            console.log(`Found ${knowledgeQuery.size} relevant knowledge chunks.`);
        }
    } catch (e) {
        console.warn("Could not query knowledge base. Proceeding without it.", e);
    }

    // 2. Call the AI with the input text and the retrieved knowledge
    console.log("Generating structured content from AI...");
    const result = await withRetry(() => prompt({ ...input, knowledge }), {
      retryOn: isRetryableGoogleAIError,
    });
    
    const structuredContent = result.output;

    if (!structuredContent) {
      throw new Error("Failed to generate structured content from the AI prompt.");
    }
    console.log("Structured content generated.");


    // 3. Post-process for media generation
    if ('contentBlocks' in structuredContent && Array.isArray(structuredContent.contentBlocks)) {
        console.log("Generating images for lesson blocks...");
        const imageGenerationPromises = structuredContent.contentBlocks.map(async (block, index) => {
            let imagePrompt = block.imageHint;

            if (imagePrompt) {
                try {
                    console.log(`Generating image for prompt: "${imagePrompt}"`);
                    const imageResult = await generateLessonImage(imagePrompt);
                    
                    const [header, base64Data] = imageResult.imageDataUri.split(',');
                    const contentType = header.split(':')[1].split(';')[0];
                    const filePath = `lesson-images/${structuredContent.id}/block_${index}.png`;
                    
                    const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                    block.generatedImageUrl = publicUrl;
                    console.log(`Image for prompt "${imagePrompt}" uploaded to ${publicUrl}`);
                } catch (imgError) {
                    console.error(`Failed to generate or upload image for prompt: "${imagePrompt}"`, imgError);
                    // Leave the block as is, without a generatedImageUrl
                }
            }
            return block;
        });

        structuredContent.contentBlocks = await Promise.all(imageGenerationPromises);
        console.log("Image generation for lesson blocks complete.");
    }

    if (input.contentType === 'ListeningTest' && 'transcript' in structuredContent && 'audioUrl' in structuredContent) {
        console.log("Generating audio for listening test...");
        
        try {
            const audioResult = await generateAudioFromText(structuredContent.transcript);
            const [header, base64Data] = audioResult.audioDataUri.split(',');
            const contentType = header.split(':')[1].split(';')[0];
            
            if (base64Data && contentType) {
                const testId = structuredContent.id;
                const filePath = `listeningTests/${testId}/${testId}.wav`;
                console.log(`Uploading ${contentType} to Firebase Storage at path: ${filePath}`);
                
                const publicUrl = await uploadAudioToStorage(base64Data, contentType, filePath);
                structuredContent.audioUrl = publicUrl;
            } else {
                 throw new Error("Malformed data URI from TTS flow.");
            }
        } catch (audioError) {
            console.error("Error during audio generation or upload:", audioError);
            structuredContent.audioUrl = "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
        }
    }
    
    return structuredContent;
  }
);

    

    