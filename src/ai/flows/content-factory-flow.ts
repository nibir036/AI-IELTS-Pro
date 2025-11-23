
'use server';

/**
 * @fileOverview A Genkit flow for processing raw text into structured lesson or test content.
 *
 * - processContent - A function that handles the content creation process.
 * - ProcessContentInput - The input type for the function.
 * - ProcessContentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';
import { generateAudioFromText } from './text-to-speech-flow';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';


const ProcessContentInputSchema = z.object({
  contentType: z.enum(['Lesson', 'ReadingTest', 'ListeningTest', 'WritingTest', 'SpeakingPrompt']),
  rawText: z.string().describe('The raw text content from a book chapter, article, or test paper to be processed.'),
});
export type ProcessContentInput = z.infer<typeof ProcessContentInputSchema>;

const PracticeQuestionSchema = z.object({
  id: z.string().describe("A unique ID for the question (e.g., q1, q2)."),
  question: z.string().describe("The question text."),
  type: z.enum(["multiple-choice", "true-false-not-given", "fill-in-the-blank"]).describe("The type of question."),
  options: z.array(z.string()).optional().describe("A list of options for multiple-choice questions."),
  answer: z.string().describe("The correct answer to the question."),
});


const LessonSchema = z.object({
  id: z.string().describe("A unique ID for the lesson (e.g., VOCAB_005, SPEAKING_006)."),
  type: z.enum(['Grammar', 'Vocabulary', 'Tips', 'Speaking']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels', "Part 1", "Part 2", "Part 3"]),
  content_en: z.string().describe("The full lesson content in English. For Speaking prompts, this is the main task description."),
});

const ReadingTestSchema = z.object({
  id: z.string().describe("A unique ID for the test (e.g., R_AC_004)."),
  title: z.string(),
  skill: z.enum(["Reading"]),
  passage: z.string(),
  questions: z.array(PracticeQuestionSchema),
});

const ListeningTestSchema = z.object({
    id: z.string().describe("A unique ID for the test (e.g., L_AC_003)."),
    title: z.string(),
    skill: z.enum(["Listening"]),
    audioUrl: z.string().url().describe("A placeholder URL for the audio file. This will be replaced by the real URL after upload."),
    transcript: z.string().describe("The full transcript of the audio."),
    questions: z.array(PracticeQuestionSchema),
});

const WritingTestSchema = z.object({
    id: z.string().describe("A unique ID for the test (e.g., IELTS_Writing_007)."),
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
  input: { schema: ProcessContentInputSchema },
  output: { schema: z.union([LessonSchema, ReadingTestSchema, ListeningTestSchema, WritingTestSchema]) },
  prompt: `You are an expert IELTS curriculum developer. Your task is to analyze the provided raw text and convert it into a structured JSON object.

  The user has specified that the content type is '{{{contentType}}}'. A 'SpeakingPrompt' should be formatted as a 'Lesson' schema with the type 'Speaking'.
  
  You must generate a valid JSON object that strictly adheres to the corresponding schema for the specified content type. Ensure all IDs are unique and follow the examples provided in the schemas.

  - Lesson Schema (for Grammar, Vocabulary, Tips, or Speaking): ${JSON.stringify(LessonSchema.shape)}
  - WritingTest Schema: ${JSON.stringify(WritingTestSchema.shape)}
  - ReadingTest Schema: ${JSON.stringify(ReadingTestSchema.shape)}
  - ListeningTest Schema: ${JSON.stringify(ListeningTestSchema.shape)}

  Raw Text to Analyze:
  ---
  {{{rawText}}}
  ---
`,
});


const contentFactoryFlow = ai.defineFlow(
  {
    name: 'contentFactoryFlow',
    inputSchema: ProcessContentInputSchema,
    outputSchema: ProcessContentOutputSchema,
  },
  async (input) => {
    const result = await withRetry(() => prompt(input), {
      retryOn: isRetryableGoogleAIError,
    });
    
    const structuredContent = result.output;

    if (!structuredContent) {
      throw new Error("Failed to generate structured content from the AI prompt.");
    }

    // If it's a listening test, generate audio, upload it, and get the public URL.
    if (input.contentType === 'ListeningTest' && 'transcript' in structuredContent && 'audioUrl' in structuredContent) {
        console.log("Generating audio for listening test...");
        try {
            const audioResult = await generateAudioFromText(structuredContent.transcript);
            
            // Convert data URI to buffer
            const base64Data = audioResult.audioDataUri.split(',')[1];
            const audioBuffer = Buffer.from(base64Data, 'base64');
            
            // Upload to Firebase Storage
            const bucket = getStorage().bucket('studio-161365104-8c7c1.firebasestorage.app');
            const fileName = `listening-audio/${structuredContent.id}_${uuidv4()}.mp3`;
            const file = bucket.file(fileName);

            await file.save(audioBuffer, {
                metadata: {
                    contentType: 'audio/mpeg',
                },
            });

            // Make the file public and get the URL
            await file.makePublic();
            structuredContent.audioUrl = file.publicUrl();

            console.log(`Audio uploaded and public URL generated: ${structuredContent.audioUrl}`);

        } catch (audioError) {
            console.error("Failed to generate or upload audio.", audioError);
            // Fallback to a known placeholder if the process fails
            structuredContent.audioUrl = "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
        }
    }
    
    return structuredContent;
  }
);
