
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
import { generateWritingTaskImage } from './generate-writing-task-image-flow';
import { uploadAudioToStorage, uploadImageToStorage } from '@/lib/firebase/storage';
import { Lesson, ListeningTest, MockTest, ReadingTest, SpeakingTest } from '@/lib/types';
import { getFirebaseAdmin } from '@/firebase/admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';


const ProcessContentInputSchema = z.object({
  contentType: z.enum(['Lesson', 'ReadingTest', 'ListeningTest', 'WritingTest', 'SpeakingPrompt']),
  rawText: z.string().describe('The raw text content or topic to be processed.'),
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
  type: z.enum(['Grammar', 'Vocabulary', 'Tips', 'Speaking']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels', "Part 1", "Part 2", "Part 3"]),
  content_en: z.string().describe("A brief, one-sentence summary of the lesson's content."),
  contentBlocks: z.array(ContentBlockSchema).describe("An array of structured content blocks that make up the lesson."),
  exercises: z.array(PracticeExerciseSchema).optional().describe("An array of practice exercises with answer key."),
});

const SpeakingPromptSetSchema = z.object({
    type: z.enum(["SpeakingPromptSet"]),
    prompts: z.array(z.object({
        id: z.string().describe("A unique ID for the lesson, e.g., SPEAKING_a4f8."),
        title: z.string().describe("The title of the prompt, e.g., 'Speaking: Holidays'."),
        level: z.enum(["Part 1", "Part 2", "Part 3"]),
        content_en: z.string().describe("The full content of the speaking prompt for that part."),
        skill: z.enum(['Speaking']).default('Speaking'),
    }))
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
    type: z.literal("ListeningTest").describe("A discriminator field for the schema union."),
    id: z.string().describe("A unique ID for the test, e.g., L_AC_p9q3."),
    title: z.string(),
    skill: z.enum(["Listening"]),
    audioUrl: z.string().url().optional().describe("A placeholder URL for the full test audio."),
    parts: z.array(ListeningTestPartSchema).describe("An array of 4 parts, each with its own transcript segment and question groups."),
    answers: z.record(z.string(), z.string()).describe("A key-value map of question IDs to correct answers."),
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
    SpeakingPromptSetSchema,
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

#### IF contentType is 'SpeakingPrompt':
*   **Role:** Act as a certified IELTS Speaking Examiner.
*   **Task:** Generate a complete, unique IELTS Speaking Test (Part 1, 2, and 3). The 'rawText' from the user is the central theme for the test.
*   **Structure Requirements:**
    1.  **Part 1:** Generate 10 standard interview-style questions covering 3 common areas (e.g., Hometown, Work/Study, Hobbies), subtly related to the 'rawText' theme if possible.
    2.  **Part 2:** Generate a detailed Cue Card prompt on the 'rawText' topic. Include the standard four bullet points (e.g., what, where, why, how).
    3.  **Part 3:** Generate 6 abstract, demanding discussion questions that naturally follow the theme of the Part 2 Cue Card.
*   **Output Format:** Your JSON output MUST be a single object that conforms to the 'SpeakingPromptSet' schema. It must contain a 'prompts' array with exactly 3 objects, one for each part of the speaking test. The title for each should be the main topic (e.g., "Speaking: Holidays"). Ensure the 'skill' field is set to 'Speaking' for each prompt.

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
*   **Task:** The 'rawText' will contain three topics separated by semicolons (e.g., "Topic 1; Topic 2; Topic 3"). Generate a Full IELTS Academic Reading Test with 3 distinct passages and **EXACTLY 40 questions in total**.
*   **Strict Formatting Rules:**
    *   The final JSON output MUST contain 3 items in the 'parts' array.
    *   Each part must contain a passage with paragraphs separated by double newlines (\\n\\n).
    *   Question IDs must be unique across the entire test (q1, q2, ... q40).
    *   Each question or group of questions requiring instructions MUST have an \`id\` field in the question object. The \`instructions\` field should be added to the \`questionGroups\`.
*   **Passage 1 (Factual Text - 13 Questions):**
    *   Topic: Use the first topic from the 'rawText' input.
    *   Length: 700-750 words.
    *   Questions 1-7: "note-completion". Instructions: "Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer."
    *   Questions 8-13: "true-false-not-given". Instructions: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE, FALSE, or NOT GIVEN."
*   **Passage 2 (Discursive Text - 13 Questions):**
    *   Topic: Use the second topic from the 'rawText' input.
    *   Length: 750-800 words.
    *   Questions 14-19: "matching-headings". Provide a list of 8 headings in the 'options' field for the first question (q14). The question's text should be the paragraph identifier (e.g., "Paragraph A"). Instructions: "Reading Passage 2 has six paragraphs, A-F. Choose the correct heading for each paragraph from the list of headings below."
    *   Questions 20-23: "matching-information". Instructions: "Look at the following statements (Questions 20-23) and the paragraphs of Reading Passage 2. Match each statement with the correct paragraph, A-F." The 'answer' for each should be a single letter (e.g., "A").
    *   Questions 24-26: "multiple-choice". Instructions: "Choose the correct letter, A, B, C or D."
*   **Passage 3 (Abstract Text - 14 Questions):**
    *   Topic: Use the third topic from the 'rawText' input.
    *   Length: 850-900 words.
    *   Questions 27-32: "summary-completion". This MUST be a single question object with id "q27". The 'question' field must contain the entire summary paragraph with placeholders like '__(27)__'. The 'answer' field must be a single, comma-separated string of the correct words.
        *   IF instructions are "Choose ONE WORD ONLY from the passage for each answer.", you MUST NOT generate an 'answerBox'.
        *   IF instructions are "Complete the summary using the list of words, A-J, below.", you MUST generate an 'answerBox' with 10 words.
    *   Questions 33-36: "yes-no-not-given". Instructions: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES, NO, or NOT GIVEN."
    *   Questions 37-40: "matching-sentence-endings". The first part of the sentence is the 'question', and the list of possible endings MUST be in the 'options' field for the first question of this block (q37). Instructions: "Complete each sentence with the correct ending, A-G, below."

#### IF contentType is 'ListeningTest':
*   **Role:** Elite IELTS Listening Test Creator.
*   **Task:** The 'rawText' input contains the full transcript for a 4-part listening test. The sections will be marked (e.g., "Section 1:", "Section 2:"). Generate a complete, 40-question IELTS-style Listening Test based on this transcript.
*   **STRICT JSON Structure:** You MUST generate a single JSON object that conforms to the ListeningTest schema. The AI should intelligently decide the question types based on the transcript content and standard IELTS formats.
*   **Strict Formatting Rules:**
    1.  **Structure:** Create 4 'parts', each with its own segment of the transcript.
    2.  **Question Grouping:** Within each part, group questions under a \`questionGroups\` array. Each object in this array must have an \`instructions\` string and a \`questions\` array. This is critical for handling multiple question formats within one part.
    3.  **Specific Question Format (Apply this structure exactly):**
        *   **Part 1:**
            *   Questions 1-2: \`multiple-choice\` (single answer from A, B, or C).
            *   Questions 3-10: \`fill-in-the-blank\` or \`note-completion\`.
        *   **Part 2:**
            *   Questions 11-15: \`fill-in-the-blank\` or \`note-completion\`.
            *   Questions 16-18: \`multiple-choice-multiple-answer\`. Instructions must say "Choose THREE answers, A-G". Provide 7 options. The answer in the \`answers\` map must be a comma-separated string (e.g., "A,D,F").
            *   Questions 19-20: \`multiple-choice-multiple-answer\`. Instructions must say "Choose TWO answers, A-E". Provide 5 options. The answer in the \`answers\` map must be a comma-separated string (e.g., "B,E").
        *   **Part 3:**
            *   Questions 21-24: \`multiple-choice\` (single answer from A, B, or C).
            *   Questions 25-27: \`multiple-choice-multiple-answer\`. Instructions must say "Choose THREE answers, A-G". Provide 7 options.
            *   Questions 28-30: \`fill-in-the-blank\` or \`note-completion\`.
        *   **Part 4:**
            *   Questions 31-40: \`fill-in-the-blank\` or \`note-completion\` (typically one-word answers).
    4.  **Audio URL:** Set the 'audioUrl' field to the following exact placeholder URL: "https://storage.googleapis.com/aidemos/devrel_and_partners/AI%20Band%20Builder/placeholder_audio_1.mp3".

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

    // 3. Call the AI with the input text and the retrieved knowledge
    console.log("Generating structured content from AI...");
    const result = await withRetry(() => prompt({ ...input, knowledge }), {
      retryOn: isRetryableGoogleAIError,
    });
    
    const structuredContent = result.output;

    if (!structuredContent) {
      throw new Error("Failed to generate structured content from the AI prompt.");
    }
    console.log("Structured content generated.");
    
    // 4. Post-process for media generation and saving
    if (input.contentType === 'SpeakingPrompt' && 'type' in structuredContent && structuredContent.type === 'SpeakingPromptSet') {
        const batch = firestore.batch();

        structuredContent.prompts.forEach(prompt => {
            const speakingTest: SpeakingTest = {
                id: prompt.id,
                title: prompt.title,
                level: prompt.level,
                content_en: prompt.content_en,
                skill: 'Speaking',
            };
            const docRef = firestore.collection('speakingTests').doc(speakingTest.id);
            batch.set(docRef, speakingTest);
        });

        await batch.commit();
        console.log("Speaking prompts saved successfully to 'speakingTests' collection.");
        return structuredContent; // Return the set itself to satisfy the flow's output schema
    }


    // 5. Post-process for media generation
    if (input.contentType === 'WritingTest' && 'questions' in structuredContent) {
        console.log("Processing Writing Test for image generation...");
        const task1 = (structuredContent as MockTest).questions.find(q => q.taskType === 'Task 1');
        if (task1 && task1.topic) {
            try {
                console.log(`Generating image for Task 1: "${task1.topic}"`);
                const imageResult = await generateWritingTaskImage(task1.topic);
                
                if (!imageResult.imageDataUri || !imageResult.imageDataUri.startsWith('data:')) {
                     throw new Error("Invalid image data URI received from image generation flow.");
                }

                const [header, base64Data] = imageResult.imageDataUri.split(',');
                const contentType = header.split(':')[1].split(';')[0];
                const filePath = `writing-tasks/${(structuredContent as MockTest).id}/task1_image.png`;
                
                const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                task1.imageUrl = publicUrl;
                console.log(`Task 1 image uploaded to ${publicUrl}`);

            } catch (imgError: any) {
                console.error(`CRITICAL: Failed to generate or upload image for Task 1: "${task1.topic}"`, imgError);
                 // Throw a new error that includes the structured content, so the client can handle it.
                 const errorWithData = new Error(`Image generation failed. Partial content: ${JSON.stringify(structuredContent)}`);
                 throw errorWithData;
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
                    
                     if (imageResult.imageDataUri.startsWith('data:')) {
                        const [header, base64Data] = imageResult.imageDataUri.split(',');
                        const contentType = header.split(':')[1].split(';')[0];
                        const filePath = `lesson-images/${(structuredContent as Lesson).id}/block_${index}.png`;
                        
                        const publicUrl = await uploadImageToStorage(base64Data, contentType, filePath);
                        block.generatedImageUrl = publicUrl;
                        console.log(`Image for prompt "${block.imageHint}" uploaded to ${publicUrl}`);
                    } else {
                        throw new Error("Generated image data URI is invalid.");
                    }
                } catch (imgError) {
                    console.error(`Failed to generate or upload image for prompt: "${block.imageHint}"`, imgError);
                    block.generatedImageUrl = "https://picsum.photos/seed/error/600/400";
                }
            }
            return block;
        });

        structuredContent.contentBlocks = await Promise.all(imageGenerationPromises);
        console.log("Image generation for lesson blocks complete.");
    }

    if (input.contentType === 'ListeningTest' && 'parts' in structuredContent && 'skill' in structuredContent && structuredContent.skill === 'Listening') {
      const listeningTest = structuredContent as ListeningTest;
      // Generate one audio file for the entire test transcript
      const fullTranscript = listeningTest.parts.map(p => p.transcript).join('\n\n');
      console.log("Generating single audio file for full listening test transcript...");
      try {
        const audioResult = await generateAudioFromText(fullTranscript);
        if (audioResult.audioDataUri) {
          const [header, base64Data] = audioResult.audioDataUri.split(',');
          const contentType = header.split(':')[1].split(';')[0];
          const filePath = `listening-tests/${listeningTest.id}/${listeningTest.id}.wav`;
          
          const publicUrl = await uploadAudioToStorage(base64Data, contentType, filePath);
          listeningTest.audioUrl = publicUrl;
          console.log(`Full test audio uploaded to ${publicUrl}`);
        }
      } catch (audioError) {
        console.error("Failed to generate or upload full test audio. The test will have no audio.", audioError);
        listeningTest.audioUrl = ''; // Ensure it's an empty string on failure
      }
    }


     // Final step for single-object content types: save to Firestore
    if (input.contentType !== 'SpeakingPrompt') {
        let targetCollection: string;
        const content = structuredContent as any;

        if (content.skill) {
             switch (content.skill) {
                case 'Reading': targetCollection = 'readingTests'; break;
                case 'Listening': targetCollection = 'listeningTests'; break;
                case 'Writing': targetCollection = 'mockTests'; break;
                default: throw new Error(`Unknown skill type for saving: ${content.skill}`);
            }
        } else if (content.type) {
             switch (content.type) {
                case 'Grammar':
                case 'Vocabulary':
                case 'Tips':
                case 'Speaking':
                    targetCollection = 'lessons';
                    break;
                case 'ListeningTest':
                    targetCollection = 'listeningTests'; break;
                default:
                     throw new Error(`Unknown content type for saving: ${content.type}`);
            }
        }
        else {
            throw new Error("Could not determine target collection for saving.");
        }
      
        if (content.id) {
            const docRef = firestore.collection(targetCollection).doc(content.id);
            await docRef.set(content);
            console.log(`Content saved to '${targetCollection}/${content.id}'.`);
        } else {
             throw new Error("Generated content is missing a valid 'id' property.");
        }
    }

    return structuredContent;
  }
);

    