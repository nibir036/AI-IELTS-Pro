
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
  instructions: z.string().optional().describe("Instructions for this block of questions, e.g., 'Choose the correct heading for each paragraph.'"),
  question: z.string().describe("The question text. For 'summary-completion', this should be the full paragraph with placeholders like '__(27)__', '__(28)__'."),
  type: z.enum(["multiple-choice", "true-false-not-given", "note-completion", "matching-headings", "matching-information", "summary-completion", "yes-no-not-given", "matching-sentence-endings", "fill-in-the-blank"]).describe("The type of question."),
  options: z.array(z.string()).optional().describe("A list of options for the question (e.g., for multiple-choice, or the list of headings for matching)."),
  answer: z.string().describe("The correct answer to the question."),
  answerBox: z.array(z.string()).optional().describe("For summary-completion, a box of words to choose from."),
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
  type: z.enum(['Grammar', 'Vocabulary', 'Tips', 'Speaking']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels', "Part 1", "Part 2", "Part 3"]),
  content_en: z.string().describe("A brief, one-sentence summary of the lesson's content."),
  contentBlocks: z.array(ContentBlockSchema).describe("An array of structured content blocks that make up the lesson."),
  exercises: z.array(PracticeExerciseSchema).optional().describe("An array of practice exercises with answer keys."),
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
    knowledge: z.string().optional().describe("Relevant information from the knowledge base."),
  }) },
  output: { schema: ProcessContentOutputSchema },
  prompt: `You are a world-class AI curriculum designer for IELTS and ESL students.
Your task is to take a raw text input and a desired content type, and generate a structured, high-quality JSON output that adheres to the specified schema for that type.

---
## Persona & Task Instructions by Content Type:

**IF contentType is 'Lesson' AND the rawText indicates a 'Grammar' topic:**
*   **Role:** Expert English language tutor specializing in IELTS.
*   **Task:** Generate a complete lesson plan focused on the grammar point from the 'rawText'.
*   **Structure Requirements:**
    1.  **Explanation:** Use 'contentBlocks' for clear explanations with usage rules for IELTS contexts.
    2.  **Examples:** Provide at least 5 example sentences in 'contentBlocks' related to common IELTS essay topics (e.g., globalization, environment, education).
    3.  **Practice:** Generate 5 practice exercises (e.g., gap-fill or sentence transformation) in the 'exercises' array, complete with an answer key.

**IF contentType is 'Lesson' AND the rawText indicates a 'Vocabulary' topic:**
*   **Role:** IELTS vocabulary expert.
*   **Task:** Generate a comprehensive vocabulary lesson on the topic from 'rawText'.
*   **Structure Requirements:**
    1.  **Word List:** Generate a list of 10 high-frequency, Band 7+ words/phrases relevant to the topic. Use 'contentBlocks' to present each word, its collocations, and synonyms.
    2.  **Examples:** Provide 5 sentence examples for each word demonstrating its use in an academic (Writing Task 2) style within the 'contentBlocks'.
    3.  **Practice:** Generate 5 short practice exercises (e.g., matching or sentence building) in the 'exercises' array, with an answer key.

**IF contentType is 'WritingTest':**
*   **Role:** Highly experienced IELTS Writing Examiner.
*   **Task:** Generate a complete, unique IELTS Writing Test (Academic Module). The test must consist of two tasks. The 'rawText' will contain two topics separated by a semicolon (e.g., "Topic for Task 1; Topic for Task 2").
*   **Structure Requirements:**
    1.  **Task 1:** Generate a task based on the analysis of a visual representation (e.g., bar chart, line graph, process diagram, or table) about the first topic from the 'rawText'. The task prompt must clearly instruct the student to select and report the main features, make comparisons, and summarize the data, keeping the response over 150 words. Do not generate the visual itself, only the prompt.
    2.  **Task 2:** Generate a full essay prompt for a Task 2 essay (250+ words) on the second topic from the 'rawText'. The essay question must be a common IELTS type (e.g., Agree/Disagree, Discussion of Both Views, Problem/Solution, or Advantages/Disadvantages).

**IF contentType is 'ReadingTest':**
*   **Role:** Act as a superior grand master level IELTS Exam Content Creator.
*   **Task:** The 'rawText' will contain three topics separated by semicolons (e.g., "Passage 1 Topic; Passage 2 Topic; Passage 3 Topic"). I need you to generate a Full IELTS Academic Reading Test containing 3 distinct passages and 40 questions in total.
*   **Strict Structure:**
    *   **PASSAGE 1 (The Factual Text)**
        *   **Topic:** [USE PASSAGE 1 TOPIC FROM 'rawText']
        *   **Length:** 700-750 words.
        *   **Style:** Descriptive, factual, easy to read.
        *   **Questions 1-7:** "note-completion". MUST have instructions like "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.".
        *   **Questions 8-13:** "true-false-not-given". MUST have instructions like "Do the following statements agree with the information given in Reading Passage 1? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.".
    *   **PASSAGE 2 (The Discursive Text)**
        *   **Topic:** [USE PASSAGE 2 TOPIC FROM 'rawText']
        *   **Length:** 750-800 words.
        *   **Style:** Argumentative, sociologic, or workplace-related.
        *   **Questions 14-19:** "matching-headings". MUST provide a list of 8 headings in the 'options' field for the first question in this block. Each question's text should be the paragraph identifier (e.g., "Paragraph A"). MUST have instructions like "Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for each paragraph from the list of headings below.".
        *   **Questions 20-23:** "matching-information". MUST have instructions like "Look at the following statements (Questions 20-23) and the paragraphs of Reading Passage 2. Match each statement with the correct paragraph, A-F.".
        *   **Questions 24-26:** "multiple-choice". MUST have instructions like "Choose the correct letter, A, B, C or D.".
    *   **PASSAGE 3 (The Abstract Text)**
        *   **Topic:** [USE PASSAGE 3 TOPIC FROM 'rawText']
        *   **Length:** 850-900 words.
        *   **Style:** Complex, scientific, theoretical, or philosophical.
        *   **Questions 27-32:** "summary-completion". This MUST be a single question object. The 'question' field must contain the entire summary paragraph with placeholders like '__(27)__'. The 'answer' field should be a comma-separated list of the correct words. The instructions MUST be one of two types: (1) "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer." - In this case, do NOT generate an 'answerBox'. (2) "Complete the summary using the list of words, A-J, below." - In this case, you MUST generate an 'answerBox' with 10 words.
        *   **Questions 33-36:** "yes-no-not-given". MUST have instructions like "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.".
        *   **Questions 37-40:** "matching-sentence-endings". The first part of the sentence is the 'question', and the list of possible endings MUST be in the 'options' field for the first question of this block. MUST have instructions like "Complete each sentence with the correct ending, A-G, below.".

*   **OUTPUT FORMAT:** The final output must be a single JSON object that strictly adheres to the 'ReadingTest' schema. It must contain 3 items in the 'parts' array, one for each passage. Question IDs must be unique across the entire test (q1, q2, ... q40).

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
    temperature: 0.4, 
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

    

    

    

    