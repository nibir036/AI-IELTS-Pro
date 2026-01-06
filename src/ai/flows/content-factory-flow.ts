'use server';

/**
 * @fileOverview A Genkit flow for processing raw text into structured lesson or test content,
 * potentially augmented by information from a knowledge base.
 *
 * - processContent - A function that handles the content creation process.
 * - ProcessContentInput - The input type for the function.
 * - ProcessContent-Output - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';
import { generateLessonImage } from './generate-lesson-image-flow';
import { generateWritingTaskImage } from './generate-writing-task-image-flow';
import { uploadImageToStorage } from '@/lib/firebase/storage';
import { Lesson, ListeningTest, MockTest, ReadingTest, SpeakingTest } from '@/lib/types';
import { getFirebaseAdmin } from '@/firebase/admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';


const ProcessContentInputSchema = z.object({
  contentType: z.enum(['Lesson', 'ReadingTest', 'ListeningTest', 'WritingTest', 'SpeakingTest']),
  rawText: z.string().describe('The raw text content or topic to be processed.'),
  transcript: z.string().optional().describe("The full transcript for a listening test."),
  answers: z.string().optional().describe("A comma-separated string of answers for a listening test."),
});
export type ProcessContentInput = z.infer<typeof ProcessContentInputSchema>;

const PracticeQuestionSchema = z.object({
  id: z.string().describe("A unique ID for the question (e.g., q1, q2)."),
  question: z.string().describe("The question text. For 'summary-completion', this should be the full paragraph with placeholders like '__(27)__'. For form-style questions, this should be the label like 'Name:'."),
  type: z.enum(["multiple-choice", "true-false-not-given", "note-completion", "matching-headings", "matching-information", "summary-completion", "yes-no-not-given", "matching-sentence-endings", "fill-in-the-blank", "multiple-choice-multiple-answer"]).describe("The type of question."),
  options: z.array(z.string()).optional().describe("A list of options for the question (e.g., for multiple-choice, or the list of headings for matching)."),
  answer: z.string().describe("The correct answer. For multiple answers, use a comma-separated string like 'A,C'."),
  answerBox: z.array(z.string()).optional().describe("For summary-completion, a box of words to choose from."),
});

const ListeningQuestionGroupSchema = z.object({
    instructions: z.string().describe("The specific instructions for this block of questions."),
    questions: z.array(z.object({
        id: z.string(),
        question: z.string(),
        type: z.enum(["multiple-choice", "note-completion", "fill-in-the-blank", "summary-completion", "multiple-choice-multiple-answer"]),
        options: z.array(z.string()).optional(),
        answer: z.string().describe("The correct answer. For multiple-choice questions, this MUST be the full text of the option (e.g. 'a display of instruments'), not just the letter. For multiple-choice-multiple-answer questions, this must be a comma-separated string of the full text of the correct options."),
    })),
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

const PracticeExerciseSchema = z.object({
    type: z.enum(['gap-fill', 'sentence-transformation', 'matching', 'sentence-building']),
    instructions: z.string(),
    questions: z.array(z.object({
        question: z.string(),
        answer: z.string(),
    })),
});

const LessonSchema = z.object({
  id: z.string().describe("A unique ID for the lesson, e.g., VOCAB_u5t9, SPEAKING_a4f8."),
  type: z.enum(['Grammar', 'Vocabulary', 'Tips']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels', "Part 1", "Part 2", "Part 3"]),
  content_en: z.string().describe("A brief, one-sentence summary of the lesson's content."),
  contentBlocks: z.array(ContentBlockSchema).describe("An array of structured content blocks that make up the lesson."),
  exercises: z.array(PracticeExerciseSchema).optional().describe("An array of practice exercises with answer key."),
});

const SpeakingTestSchema = z.object({
    id: z.string().describe("A unique ID for the test, e.g., SPEAKING_a4f8."),
    title: z.string().describe("The overall topic for the test, extracted from the user's prompt (e.g., 'Technology', 'A Memorable Holiday')."),
    skill: z.enum(['Speaking']).default('Speaking'),
    part1: z.string().describe("The full text for all AUTO-GENERATED Part 1 questions, separated by newlines."),
    part2: z.string().describe("The full text for the Part 2 cue card, based on the user's prompt."),
    part3: z.string().describe("The full text for all Part 3 discussion questions, based on the user's prompt."),
});


const ReadingTestPartSchema = z.object({
    part: z.number(),
    title: z.string(),
    passage: z.string(),
    questions: z.array(PracticeQuestionSchema),
});

const ReadingTestSchema = z.object({
  id: z.string().describe("A unique ID for the test, e.g., R_AC_x7y2."),
  title: z.string(),
  skill: z.enum(["Reading"]),
  parts: z.array(ReadingTestPartSchema),
});

const ListeningTestPartSchema = z.object({
    part: z.number(),
    title: z.string(),
    audioUrl: z.string().url().optional(),
    transcript: z.string().describe("The transcript for this specific part of the test."),
    questionGroups: z.array(ListeningQuestionGroupSchema),
});

const ListeningTestSchema = z.object({
    type: z.enum(["ListeningTest"]).describe("A discriminator field for the schema union."),
    id: z.string().describe("A unique ID for the test, e.g., L_AC_p9q3."),
    title: z.string(),
    skill: z.enum(["Listening"]),
    audioUrl: z.string().url().optional().describe("A placeholder URL for the full test audio."),
    parts: z.array(ListeningTestPartSchema).describe("An array of 4 parts, each with its own transcript segment and question groups."),
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
        imageUrl: z.string().url().optional().describe("The public URL of the generated image for Task 1."),
    })),
});


const ProcessContentOutputSchema = z.union([
    LessonSchema,
    ReadingTestSchema,
    ListeningTestSchema,
    WritingTestSchema,
    SpeakingTestSchema,
]);
export type ProcessContentOutput = z.infer<typeof ProcessContentOutputSchema>;


export async function processContent(
  input: ProcessContentInput
): Promise<ProcessContentOutput> {
  return contentFactoryFlow(input);
}


const prompt = ai.definePrompt({
  name: 'contentFactoryPrompt',
  input: { schema: ProcessContentInputSchema },
  output: { schema: ProcessContentOutputSchema },
  prompt: `You are an AI system with two specialized personas acting in a sequence.
FIRST, you are a "Creative Associate" who brainstorms content.
SECOND, you are a "Senior Editor & Formatter" who strictly validates and formats that content into a final JSON output.

---
### WORKFLOW ###
1.  **Creative Associate Role:** Based on the user's input, first mentally brainstorm and generate the required content (passages, questions, answers, lesson text).
2.  **Senior Editor Role:** Take the brainstormed content from Step 1 and meticulously format it into a single, valid JSON object that strictly adheres to the user's requested 'contentType' and the corresponding schema provided in this prompt. This is your ONLY output.

---
### PERSONA & TASK INSTRUCTIONS BY CONTENT TYPE ###

#### IF contentType is 'Lesson' and the topic is 'Vocabulary':
*   **Role:** Expert English Language Tutor & Lexicographer for IELTS.
*   **Task:** Generate a comprehensive vocabulary lesson based on the theme in \`rawText\`.
*   **Structure Requirements:**
    1.  **ID/Metadata:** Generate a unique ID, a clear title (e.g., "Essential Vocabulary: [Topic]"), set level to 'Intermediate' or 'Advanced', and write a one-sentence \`content_en\` summary.
    2.  **Content Blocks:** You MUST use the \`contentBlocks\` array to structure the entire lesson.
    3.  **Sectioning:** Create multiple 'explanation' type blocks, each with a \`sectionTitle\` (e.g., "1. Core Concepts", "2. Causes and Impacts", "3. Solutions and Actions", "4. Useful Collocations").
    4.  **Word Lists:** Within each section's 'explanation' block, present a list of 5-10 thematically related vocabulary words. For each word, provide a concise definition relevant to the IELTS context. Use HTML for structure, e.g., \`<b>Word:</b> Definition<br>\`.
    5.  **Example Sentences:** Create a separate 'example_list' block with example sentences for some of the key vocabulary. Use \`<b>\` tags to highlight the vocabulary word in each sentence.
    6.  **Practice:** Generate at least one 'gap-fill' practice exercise in the \`exercises\` array with 5 questions that test the newly introduced vocabulary, and provide a clear answer key.

#### IF contentType is 'Lesson' (e.g., Grammar or Tips):
*   **Role:** Expert English Language Tutor for IELTS.
*   **Task:** Generate a complete lesson plan based on the \`rawText\`.
*   **Structure Requirements:**
    1.  **ID/Metadata:** Generate a unique ID, title, level, and a one-sentence \`content_en\` summary.
    2.  **Content Blocks:** Use \`contentBlocks\` to provide clear explanations, examples, and tips. Use \`<b>\` tags for emphasis.
    3.  **Practice:** Generate at least one practice exercise in the \`exercises\` array with 5 questions and a clear answer key.

#### IF contentType is 'SpeakingTest':
*   **Role:** Act as a certified IELTS Speaking Examiner.
*   **Task:** The user's \`rawText\` contains the prompts for Part 2 and Part 3. Your job is to take those prompts and automatically generate a standard, appropriate Part 1 to create a complete, three-part test.
*   **Structure Requirements:**
    1.  **Part 1 (Auto-Generate):** You MUST generate 4-5 standard, generic interview questions for Part 1. These should cover common topics like hometown, work/studies, or hobbies. Combine them into a single string in the \`part1\` field, separated by newlines.
    2.  **Part 2 & 3 (User-Provided):** Use the user's \`rawText\` to populate the \`part2\` and \`part3\` fields.
    3.  **Title:** Extract a concise title from the user's Part 2 prompt (e.g., "A Piece of Technology", "A Memorable Holiday").
*   **Output Format:** Your JSON output MUST be a single object conforming to the 'SpeakingTest' schema, with \`id\`, \`title\`, \`skill\`, \`part1\`, \`part2\`, and \`part3\` fields.

#### IF contentType is 'WritingTest':
*   **Role:** Act as a highly experienced IELTS Writing Examiner.
*   **Task:** The 'rawText' will contain one or two topics. Generate a complete IELTS Writing Test. If only a Task 2 topic is provided, create a relevant, generic Task 1 topic.
*   **Structure Requirements:** Generate two questions (Task 1 and Task 2) with topics, word counts, and task types. DO NOT include an 'imageUrl' field.
*   **Output Format:** Your JSON output MUST conform to the WritingTest schema.

#### IF contentType is 'ReadingTest':
*   **Role:** Act as a superior grand master level IELTS Exam Content Creator.
*   **Task:** The 'rawText' will contain one topic. Generate a FULL IELTS Academic Reading Test with 3 distinct passages and **EXACTLY 40 questions in total**. Each passage should be around 750-850 words.
*   **Strict Formatting Rules:**
    1.  **Passages:** Create three unique, academic-style passages based on the provided topic.
    2.  **Question Variety:** Include a wide variety of question types across the 40 questions (e.g., multiple-choice, T/F/NG, matching headings, summary completion, etc.).
    3.  **Unique IDs:** Ensure all 40 questions have unique IDs (q1, q2, ... q40).
*   **Output Format:** Your entire output must be a single JSON object conforming to the ReadingTest schema.

#### IF contentType is 'ListeningTest':
*   **Role:** Elite IELTS Listening Test Content Parser.
*   **Task:** The user will provide three inputs: \`rawText\` (the full 40-question test paper), \`transcript\` (the full audio transcript), and \`answers\` (a comma-separated list of all 40 correct answers). Your task is to precisely parse and combine these three inputs into a single, valid JSON object.
*   **STRICT JSON Structure:**
    1.  **Question Parsing:**
        *   **CRITICAL RULE:** If an instruction specifies a range (e.g., "Questions 16-18"), you MUST create a separate, individual question object for each number in that range (i.e., one for Q16, one for Q17, one for Q18). Each will share the same question text and options. Their IDs must be unique (q16, q17, q18).
        *   Group consecutive questions that share the same instructions into a single object within the \`questionGroups\` array. Each group MUST have an \`instructions\` string and a \`questions\` array.
    2.  **Assign Answers (\`answers\`):**
        *   Take the comma-separated answers string and assign the correct answer to the \`answer\` field of each corresponding question object (q1, q2, ... q40).
        *   **CRITICAL ANSWER RULE:** For multiple-choice questions (including multiple-answer), the answer MUST be the full text of the option (e.g., "a display of instruments"), NOT just the letter (e.g., 'B').
        *   For multiple-choice-multiple-answer questions (e.g., "Choose TWO letters A-E"), the 'answer' field must be a comma-separated string of the full text of the correct options.
    3.  **Divide Transcript (\`transcript\`):** Logically divide the full transcript into four segments and place each segment into the 'transcript' field of the corresponding 'part' object (Part 1, Part 2, Part 3, Part 4).
    4.  **Audio URL:** For the top-level \`audioUrl\`, set the 'audioUrl' field to the following exact placeholder URL: "https://storage.googleapis.com/aidemos/devrel_and_partners/AI%20Band%20Builder/placeholder_audio_1.mp3". DO NOT add an \`audioUrl\` field to the individual \`parts\` objects.
    5.  **Output:** Your entire output must be a single JSON object conforming to the ListeningTest schema.

---
### GENERAL RULES ###

- **ID Generation:** Always generate a completely new, unique 'id' for the content.
- **Output Format:** JSON ONLY. Do not write markdown or conversational text. Your entire output must be a single JSON object that can be parsed directly.

---
### INPUT ###

- **Desired Content Type:** '{{{contentType}}}'
- **Knowledge Base Context (use if helpful):** {{{knowledge}}}
- **Raw Text/Question Paper:** '{{{rawText}}}'
- **Transcript (for ListeningTest):** '{{{transcript}}}'
- **Answers (for ListeningTest):** '{{{answers}}}'
`,
  config: {
    temperature: 0.2, 
  }
});


const contentFactoryFlow = ai.defineFlow(
  {
    name: 'contentFactoryFlow',
    inputSchema: ProcessContentInputSchema,
    outputSchema: ProcessContentOutputSchema,
  },
  async (input) => {
    // 1. Initialize Firebase Admin and get Firestore
    getFirebaseAdmin();
    const firestore = getAdminFirestore();

    // 2. Retrieve relevant knowledge from Firestore
    console.log("Searching knowledge base...");
    let knowledge = '';
    try {
        const knowledgeCollectionRef = firestore.collection('knowledge');
        const knowledgeQuery = knowledgeCollectionRef.limit(5);
        const knowledgeSnapshot = await knowledgeQuery.get();

        if (!knowledgeSnapshot.empty) {
            knowledge = knowledgeSnapshot.docs.map(doc => doc.data().chunk).join('\n\n---\n\n');
            console.log(`Found ${knowledgeSnapshot.size} relevant knowledge chunks.`);
        }
    } catch (e) {
        console.warn("Could not query knowledge base. Proceeding without it.", e);
    }

    // 3. Call the AI to generate structured text content
    console.log("Generating structured content from AI...");
    const result = await withRetry(() => prompt({ ...input, knowledge }), {
      retryOn: isRetryableGoogleAIError,
    });
    
    let structuredContent = result.output;

    if (!structuredContent) {
      throw new Error("Failed to generate structured content from the AI prompt.");
    }
    console.log("Structured content generated.");
    
    // 4. Post-process for media generation
    if (input.contentType === 'WritingTest' && 'questions' in structuredContent) {
        console.log("Processing Writing Test for image generation...");
        const mockTest = structuredContent as MockTest;
        const task1 = mockTest.questions.find(q => q.taskType === 'Task 1');
        if (task1 && task1.topic) {
            try {
                console.log(`Generating image for Task 1: "${task1.topic}"`);
                const imageResult = await withRetry(() => generateWritingTaskImage(task1.topic), {
                    retryOn: isRetryableGoogleAIError,
                    retries: 2,
                });
                
                if (!imageResult.imageDataUri || !imageResult.imageDataUri.startsWith('data:')) {
                     throw new Error("Invalid image data URI received from image generation flow.");
                }

                const [header, base64Data] = imageResult.imageDataUri.split(',');
                const contentType = header.split(':')[1].split(';')[0];
                const filePath = `writing-tasks/${mockTest.id}/task1_image.png`;
                
                const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                task1.imageUrl = publicUrl;
                console.log(`Task 1 image uploaded to ${publicUrl}`);

            } catch (imgError: any) {
                console.error(`Warning: Failed to generate or upload image for Task 1. Saving test with placeholder image.`, imgError);
                task1.imageUrl = "https://storage.googleapis.com/aidemos/devrel_and_partners/AI%20Band%20Builder/placeholder_chart_1.png";
            }
        }
    } else if (input.contentType === 'Lesson' && 'contentBlocks' in structuredContent && Array.isArray(structuredContent.contentBlocks)) {
        console.log("Processing Lesson for image generation...");
        const lesson = structuredContent as Lesson;
        
        for (const block of lesson.contentBlocks) {
            if (block.type === 'image_placeholder' && block.imageHint) {
                try {
                    console.log(`Generating image for prompt: "${block.imageHint}"`);
                    const imageResult = await generateLessonImage(block.imageHint);
                    
                    if (imageResult.imageDataUri.startsWith('data:')) {
                        const [header, base64Data] = imageResult.imageDataUri.split(',');
                        const contentType = header.split(':')[1].split(';')[0];
                        const filePath = `lesson-images/${lesson.id}/block_${lesson.contentBlocks.indexOf(block)}.png`;
                        
                        const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                        block.generatedImageUrl = publicUrl;
                        console.log(`Image for prompt "${block.imageHint}" uploaded to ${publicUrl}`);
                    } else {
                        throw new Error("Generated image data URI is invalid.");
                    }
                } catch (imgError) {
                    console.error(`Failed to generate or upload image for prompt: "${block.imageHint}"`, imgError);
                    block.generatedImageUrl = "https://picsum.photos/seed/error/600/400"; // Fallback placeholder
                }
            }
        }
        console.log("Image generation for lesson blocks complete.");
    }


     // 5. Final step: save the single content object to Firestore
    let targetCollection: string | null = null;
    const content = structuredContent as any;

    if (input.contentType === 'Lesson') targetCollection = 'lessons';
    if (input.contentType === 'ReadingTest') targetCollection = 'readingTests';
    if (input.contentType === 'WritingTest') targetCollection = 'mockTests';
    if (input.contentType === 'ListeningTest') targetCollection = 'listeningTests';
    if (input.contentType === 'SpeakingTest') targetCollection = 'speakingTests';

    if (targetCollection) {
        // This is the critical change: force Firestore to generate the ID.
        const docRef = firestore.collection(targetCollection).doc();
        content.id = docRef.id; // Assign the new unique ID back to the object.
        await docRef.set(content);
        console.log(`Content saved to '${targetCollection}/${content.id}'.`);
    } else {
         throw new Error(`Could not determine target collection for saving content type: ${input.contentType}.`);
    }

    return structuredContent;
  }
);
