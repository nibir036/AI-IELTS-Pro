
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

const ContentBlockSchema = z.object({
    type: z.enum(['explanation', 'example', 'tip', 'image_placeholder']),
    content: z.string().describe("The text content for this block. For 'image_placeholder', this is a description of the desired image."),
    imageHint: z.string().optional().describe("A 1-2 word hint for finding an image directly related to the content. E.g., for 'A man is reading a book', the hint would be 'man reading'."),
    generatedImageUrl: z.string().url().optional().describe("The URL of the AI-generated image for this block."),
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
  prompt: `You are an expert instructional designer and visual artist for an IELTS learning app. Your task is to transform raw text into a structured, engaging, and visually rich JSON object.

  CRITICAL: You MUST generate a completely new, unique 'id' for the content. Do NOT reuse existing ID patterns. The ID should be a short, random string, prefixed by the content type (e.g., LISTENING_a4f8, READING_z1w5).

  The user has specified that the desired content type is '{{{contentType}}}'. A 'SpeakingPrompt' should be formatted as a 'Lesson' schema with the type 'Speaking'.
  
  You must generate a valid JSON object that strictly adheres to the corresponding schema for the specified content type.

  **For 'Lesson' Content Type (Grammar, Vocab, etc.):**
  - Analyze the 'rawText' to understand the core concept.
  - Break down the explanation into logical 'contentBlocks'.
  - Use different block types to create an engaging flow:
    - 'explanation': For core teaching text.
    - 'example': For standalone example sentences or short dialogues. Highlight these.
    - 'tip': For helpful hints or warnings.
    - 'image_placeholder': Where a visual would help clarify a concept, add a placeholder. Describe the image in the 'content' field.
  - **CRITICALLY IMPORTANT: For every 'example' block and 'image_placeholder' block, you MUST provide a relevant 2-word 'imageHint' that visually describes the *concrete subject and action* of the content.
    - If the example is 'Nurses look after patients in hospitals', the imageHint must be 'nurse with patient'.
    - If the example is 'The earth goes round the sun.', the imageHint must be 'earth orbiting sun'.
    - If the example is 'She is driving to work', the imageHint must be 'woman driving'.
    - DO NOT derive the hint from the abstract grammatical rule. Base it on the real-world content of the sentence.**
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
    if (structuredContent.type === 'Lesson' && Array.isArray(structuredContent.contentBlocks)) {
        console.log("Generating images for lesson blocks...");
        const imageGenerationPromises = structuredContent.contentBlocks.map(async (block, index) => {
            let imagePrompt = '';
            if (block.type === 'image_placeholder' && block.content) {
                imagePrompt = block.content;
            } else if (block.type === 'example' && block.imageHint) {
                imagePrompt = block.imageHint;
            }

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
