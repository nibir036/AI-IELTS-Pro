
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
  question: z.string().describe("The question text. For 'summary-completion', this should be the full paragraph with placeholders like '__(27)__'."),
  type: z.enum(["multiple-choice", "true-false-not-given", "note-completion", "matching-headings", "matching-information", "summary-completion", "yes-no-not-given", "matching-sentence-endings", "fill-in-the-blank"]).describe("The type of question."),
  options: z.array(z.string()).optional().describe("A list of options for the question (e.g., for multiple-choice, or the list of headings for matching)."),
  answer: z.string().describe("The correct answer to the question. For summary-completion, this is a comma-separated string of words."),
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
        imageUrl: z.string().url().optional().describe("The public URL of the generated image for Task 1."),
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
  prompt: `You are an AI system with two specialized personas acting in a sequence.
FIRST, you are a "Creative Associate" who brainstorms content.
SECOND, you are a "Senior Editor & Formatter" who strictly validates and formats that content into a final JSON output.

---
### WORKFLOW ###
1.  **Creative Associate Role:** Based on the user's input ('contentType' and 'rawText'), first mentally brainstorm and generate the required content (passages, questions, answers, lesson text). Do this internally.
2.  **Senior Editor Role:** Take the brainstormed content from Step 1 and meticulously format it into a single, valid JSON object that strictly adheres to the user's requested 'contentType' and the corresponding schema provided in this prompt. This is your ONLY output.

---
### PERSONA & TASK INSTRUCTIONS BY CONTENT TYPE ###

#### IF contentType is 'Lesson' (e.g., Grammar or Vocabulary):
*   **Role:** Expert English Language Tutor for IELTS.
*   **Task:** Generate a complete lesson plan.
*   **Structure Requirements:**
    1.  **ID/Metadata:** Generate a unique ID, title, level, and a one-sentence \`content_en\` summary.
    2.  **Content Blocks:** Use \`contentBlocks\` to provide clear explanations, examples, and tips. Use \`<b>\` tags for emphasis.
    3.  **Practice:** Generate at least one practice exercise in the \`exercises\` array with 5 questions and a clear answer key.

#### IF contentType is 'WritingTest':
*   **Role:** Act as a highly experienced IELTS Writing Examiner.
*   **Task:** The 'rawText' will contain one or two topics separated by a semicolon (e.g., "A topic for Task 1; A topic for Task 2" or just "A topic for Task 2"). Generate a complete IELTS Writing Test. If only a Task 2 topic is provided, create a relevant, generic Task 1 topic (e.g., a simple chart about education trends if Task 2 is about education).
*   **Structure Requirements:**
    1.  **IELTS Writing Task 1 (Academic):**
        *   **Topic:** Generate a prompt based on a visual representation (e.g., bar chart, line graph, process diagram, or table). The prompt must instruct the student to select and report main features and make comparisons.
        *   **Word Count:** The target word count must be 150.
    2.  **IELTS Writing Task 2 (Essay):**
        *   **Topic:** Use the provided topic from the 'rawText' input.
        *   **Question Type:** The essay prompt must be a common IELTS type (e.g., Agree/Disagree, Discussion of Both Views, Problem/Solution, or Advantages/Disadvantages).
        *   **Word Count:** The target word count must be 250.
*   **Output Format:** Your JSON output MUST be an object that conforms to the WritingTest schema, containing two items in the 'questions' array, one for each task.

#### IF contentType is 'ReadingTest':
*   **Role:** Act as a superior grand master level IELTS Exam Content Creator.
*   **Task:** The 'rawText' will contain three topics separated by semicolons (e.g., "Topic 1; Topic 2; Topic 3"). Generate a Full IELTS Academic Reading Test with 3 distinct passages and 40 questions in total.
*   **Strict Formatting Rules:**
    *   The final JSON output MUST contain 3 items in the 'parts' array.
    *   Each part must contain a passage with paragraphs separated by double newlines (\\n\\n).
    *   Question IDs must be unique across the entire test (q1, q2, ... q40).
    *   Each question or group of questions requiring instructions MUST have a complete \`instructions\` field.
*   **Passage 1 (Factual Text - Questions 1-13):**
    *   Topic: Use the first topic from the 'rawText' input.
    *   Length: 700-750 words.
    *   Questions 1-7: "note-completion". Instructions: "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer."
    *   Questions 8-13: "true-false-not-given". Instructions: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE, FALSE, or NOT GIVEN."
*   **Passage 2 (Discursive Text - Questions 14-26):**
    *   Topic: Use the second topic from the 'rawText' input.
    *   Length: 750-800 words.
    *   Questions 14-19: "matching-headings". Provide a list of 8 headings in the 'options' field for the first question (q14). The question's text should be the paragraph identifier (e.g., "Paragraph A"). Instructions: "Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for each paragraph from the list of headings below."
    *   Questions 20-23: "matching-information". Instructions: "Look at the following statements (Questions 20-23) and the paragraphs of Reading Passage 2. Match each statement with the correct paragraph, A-F." The 'answer' for each should be a single letter (e.g., "A").
    *   Questions 24-26: "multiple-choice". Instructions: "Choose the correct letter, A, B, C or D."
*   **Passage 3 (Abstract Text - Questions 27-40):**
    *   Topic: Use the third topic from the 'rawText' input.
    *   Length: 850-900 words.
    *   Questions 27-32: "summary-completion". This MUST be a single question object with id "q27". The 'question' field must contain the entire summary paragraph with placeholders like '__(27)__'. The 'answer' field must be a single, comma-separated string of the correct words.
        *   IF instructions are "Choose ONE WORD ONLY from the passage for each answer.", you MUST NOT generate an 'answerBox'.
        *   IF instructions are "Complete the summary using the list of words, A-J, below.", you MUST generate an 'answerBox' with 10 words.
    *   Questions 33-36: "yes-no-not-given". Instructions: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES, NO, or NOT GIVEN."
    *   Questions 37-40: "matching-sentence-endings". The first part of the sentence is the 'question', and the list of possible endings MUST be in the 'options' field for the first question of this block (q37). Instructions: "Complete each sentence with the correct ending, A-G, below."

---
### GENERAL RULES ###

- **ID Generation:** Always generate a completely new, unique 'id' for the content.
- **Output Format:** JSON ONLY. Do not write markdown or conversational text. Your entire output must be a single JSON object that can be parsed directly.

---
### INPUT ###

- **Desired Content Type:** '{{{contentType}}}'
- **Knowledge Base Context (use if helpful):** {{{knowledge}}}
- **Raw Text to Process:** '{{{rawText}}}'
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
    if (input.contentType === 'WritingTest' && 'questions' in structuredContent) {
        console.log("Processing Writing Test for image generation...");
        const task1 = structuredContent.questions.find(q => q.taskType === 'Task 1');
        if (task1) {
            try {
                // The topic itself is the prompt for the image generation.
                const imagePrompt = `A data visualization for an IELTS Writing Task 1 prompt: ${task1.topic}`;
                console.log(`Generating image for Task 1 with prompt: "${imagePrompt}"`);
                
                const imageResult = await generateLessonImage(imagePrompt);
                
                const [header, base64Data] = imageResult.imageDataUri.split(',');
                const contentType = header.split(':')[1].split(';')[0];
                const filePath = `writing-tasks/${structuredContent.id}/task1_image.png`;
                
                const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                task1.imageUrl = publicUrl;
                console.log(`Task 1 image uploaded to ${publicUrl}`);

            } catch (imgError) {
                console.error(`Failed to generate or upload image for Task 1: "${task1.topic}"`, imgError);
                // Assign a placeholder on failure to prevent crashes, but log the error.
                task1.imageUrl = "https://picsum.photos/seed/error/600/400";
            }
        }
    }

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
