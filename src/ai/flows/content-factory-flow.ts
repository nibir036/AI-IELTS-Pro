
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
  options: z.array(z.string()).optional().describe("A list of options for multiple-choice or true-false-not-given questions."),
  answer: z.string().describe("The correct answer to the question."),
});

const GrammarTableRowSchema = z.object({
    subject: z.string(),
    verb: z.string(),
});

const ContentBlockSchema = z.object({
    type: z.enum(['explanation', 'example', 'tip', 'image_placeholder', 'grammar_table', 'example_list']),
    sectionTitle: z.string().optional().describe("A title for this block, e.g., 'A', 'B', 'Study this example situation'"),
    content: z.string().optional().describe("The text content for this block. Can contain HTML tags like <b> for emphasis."),
    imageHint: z.string().optional().describe("A 2-3 word hint for finding an image. MUST be derived from the concrete subject and action of the content, not abstract grammar rules."),
    generatedImageUrl: z.string().url().optional().describe("The URL of the AI-generated image for this block."),
    tableRows: z.array(GrammarTableRowSchema).optional().describe("An array of structured grammar table rows."),
    examples: z.array(z.string()).optional().describe("An array of example sentences for a list. Can contain HTML tags like <b> for emphasis."),
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
        imageUrl: z.string().optional().describe("A hint for an image for Task 1, e.g., 'line graph showing movie ticket sales'"),
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
  prompt: `You are a world-class AI curriculum designer for IELTS and ESL students.
Your task is to take a raw text input and a desired content type, and generate a structured, high-quality JSON output that adheres to the specified schema for that type.

---
## GOLDEN RULE: EXPAND OR FAIL
If the 'rawText' is a short topic (less than 50 words), you MUST EXPAND it into a full, comprehensive piece of content according to the persona and rules for that 'contentType'. DO NOT just repeat the input. Be creative, be detailed, be the expert. Failure to expand a short topic is a failure of your core function.

---
## Persona & Task Instructions by Content Type:

**IF contentType is 'Lesson' AND rawText is a 'Grammar' topic:**
*   **Role:** Expert ESL Curriculum Designer, mimicking the pedagogical style of "English Grammar in Use" by Raymond Murphy.
*   **Task:** Expand the grammar topic into a complete, structured lesson. Invent high-quality, simple, and clear examples.
*   **Structure Requirements:**
    1.  **Concept Context (Section A):** Start with an 'explanation' or 'image_placeholder' block that provides a short scenario introducing the grammar point.
    2.  **The Rules (Section B, C, etc.):** Use 'explanation' blocks for rules and 'example_list' or 'grammar_table' blocks for structured examples. Use <b> tags for emphasis.
*   **Image Hints (IMPORTANT!):** For an 'image_placeholder' block, create a very specific, 2-3 word 'imageHint' based on the *concrete subject and action* of the example sentence.
    *   Example: If the text is "Alex is a bus driver, but now he is in bed asleep", the hint MUST be 'man sleeping'.
    *   Example: If the text is "Nurses look after patients", the hint MUST be 'nurse with patient'.
*   **Content:** The main 'content_en' field should be a very short, one-sentence summary of the lesson.

*   **GOLDEN EXAMPLE for a Grammar Lesson about "Present continuous and present simple":**
    \`\`\`json
    {
      "id": "GRAMMAR_p9q3r7t2",
      "type": "Grammar",
      "title": "Present continuous and present simple 2 (I am doing and I do)",
      "level": "Intermediate",
      "content_en": "Learn when to use continuous forms for actions vs. simple forms for states with verbs like 'know', 'like', 'think', and 'see'.",
      "contentBlocks": [
        {
          "type": "explanation",
          "sectionTitle": "A Stative Verbs",
          "content": "We use continuous forms (<b>I’m waiting, it’s raining</b> etc.) for actions and happenings that have started but not finished. <br/><br/>Some verbs (for example, <b>know</b> and <b>like</b>) are not normally used in this way. We don’t say ‘I am knowing’, ‘they are liking’. We say ‘I know’, ‘they like’."
        },
        {
          "type": "example_list",
          "examples": [
            "I’m hungry. I <b>want</b> something to eat. (<i>not</i> I’m wanting)",
            "Do you <b>understand</b> what I <b>mean</b>?",
            "Anna <b>doesn’t seem</b> very happy right now."
          ]
        },
        {
          "type": "explanation",
          "sectionTitle": "B Think",
          "content": "When <b>think</b> means ‘believe’ or ‘have an opinion’, we do not use the continuous:<br/><i>I <b>think</b> Mary is Canadian, but I’m not sure.</i><br/><br/>When <b>think</b> means ‘consider’, the continuous is possible:"
        },
        {
          "type": "image_placeholder",
          "content": "Nicky <b>is thinking</b> of giving up her job.",
          "imageHint": "woman thinking job"
        },
        {
          "type": "explanation",
          "sectionTitle": "C See, hear, smell, taste",
          "content": "We normally use the present simple (not continuous) with <b>see, hear, smell, taste</b>:<br/><i><b>Do you see</b> that man over there?</i><br/><i>This soup <b>doesn’t taste</b> very good.</i><br/><br/>You can use the present simple or continuous to say how somebody <b>looks</b> or <b>feels</b> now:<br/><i>You <b>look</b> well today. or You’<b>re looking</b> well today.</i>"
        },
        {
          "type": "explanation",
          "sectionTitle": "D am/is/are being",
          "content": "You can say <b>he’s being</b> …, <b>you’re being</b> … etc. to say how somebody is behaving now:"
        },
        {
          "type": "image_placeholder",
          "content": "I can’t understand why he’<b>s being</b> so selfish. He isn’t usually like that.",
          "imageHint": "man being selfish"
        },
        {
          "type": "explanation",
          "content": "Compare:<br/><i>He never thinks about other people. He <b>is</b> very selfish. (= he is selfish generally, not only now)</i><br/><br/>We use <b>am/is/are being</b> to say how a person is behaving. It is not usually possible in other situations:<br/><i>Sam <b>is</b> ill. (not is being ill)</i>"
        }
      ]
    }
    \`\`\`

**IF contentType is 'Lesson' AND rawText is a 'Vocabulary' topic:**
*   **Role:** Expert Lexicographer and IELTS coach.
*   **Task:** Create a vocabulary list from the topic. For each word, provide a simple definition and a clear example sentence relevant to IELTS.
*   **Structure:** Create multiple 'contentBlocks'. Each block should have the vocabulary word as the 'sectionTitle', and the definition and example sentence in the 'content'.

**IF contentType is 'Lesson' AND rawText is a 'Tips' topic:**
*   **Role:** Senior IELTS Examiner giving advice.
*   **Task:** Expand the topic into a concise, actionable tip.
*   **Structure:** Use a 'tip' type 'contentBlock'. The 'content' should be the full, detailed tip.

**IF contentType is 'SpeakingPrompt':**
*   **Role:** IELTS Speaking Test Designer.
*   **Task:** Based on the 'rawText' topic, generate a set of related speaking prompts for all three parts of the test.
*   **Structure:** Create three separate 'Lesson' objects in the output, one for each part ('Part 1', 'Part 2', 'Part 3'). Each lesson's 'content_en' will contain the respective prompts.

**IF contentType is 'WritingTest':**
*   **Role:** IELTS Test Creator.
*   **Task:** Generate a realistic IELTS Writing Test based on the 'rawText' topic.
*   **Structure:** Generate one question for Task 1 and one for Task 2. For Task 1 (Academic), include an 'imageUrl' hint describing a chart or graph (e.g., 'line graph showing visitor numbers').

**IF contentType is 'ReadingTest':**
*   **Role:** Academic Test Designer.
*   **Task:** The 'rawText' will contain the passage or transcript. If it doesn't exist, create it. Then generate 8-10 relevant questions of various types (multiple-choice, true-false-not-given, fill-in-the-blank) based STRICTLY on the provided text. For 'true-false-not-given' questions, ensure the options array is \`["True", "False", "Not Given"]\`.
*   **Structure:** The 'passage' or 'transcript' field should contain the full text. The 'questions' array should be populated with questions and their correct answers.

**IF contentType is 'ListeningTest':**
*   **Role:** Academic Test Designer.
*   **Task:** The 'rawText' will contain the transcript. If it doesn't exist, create it. Then generate 5-7 relevant questions of various types (multiple-choice, fill-in-the-blank) based STRICTLY on the provided text.
*   **Structure:** The 'transcript' field should contain the full text. The 'questions' array should be populated with questions and their correct answers. The 'audioUrl' should be left as a placeholder.

---
## General Rules:

- **ID Generation:** Always generate a completely new, unique 'id' for the content.
- **Output Format:** JSON ONLY. Do not write markdown or conversational text.

---
### INPUT:

- **Desired Content Type:** '{{{contentType}}}'
- **Knowledge Base Context (use if helpful):** {{{knowledge}}}
- **Raw Text to Process:** '{{{rawText}}}'

---
`,
  config: {
    temperature: 0.2, // Lower temperature for more predictable, structured output
  }
});


const contentFactoryFlow = ai.defineFlow(
  {
    name: 'contentFactoryFlow',
    inputSchema: ProcessContentInputSchema,
    outputSchema: ProcessContentOutputSchema,
  },
  async (input) => {
    const adminApp = await getFirebaseAdmin();
    const firestore = adminApp.firestore();
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
            if (block.type === 'image_placeholder' && block.imageHint) {
                try {
                    console.log(`Generating image for prompt: "${block.imageHint}"`);
                    const imageResult = await generateLessonImage(block.imageHint);
                    
                    const [header, base64Data] = imageResult.imageDataUri.split(',');
                    const contentType = header.split(':')[1].split(';')[0];
                    const filePath = `lesson-images/${structuredContent.id}/block_${index}.png`;
                    
                    const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                    block.generatedImageUrl = publicUrl;
                    console.log(`Image for prompt "${block.imageHint}" uploaded to ${publicUrl}`);
                } catch (imgError) {
                    console.error(`Failed to generate or upload image for prompt: "${block.imageHint}"`, imgError);
                    // IMPORTANT: Fallback to a valid, whitelisted URL to prevent client-side crashes.
                    block.generatedImageUrl = "https://picsum.photos/seed/error/600/400";
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

    