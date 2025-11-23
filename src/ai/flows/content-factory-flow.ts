
'use server';

/**
 * @fileOverview A Genkit flow for processing raw text into structured lesson or test content.
 *
 * - processContent - A function that handles the content creation process.
 * - ProcessContentInput - The input type for the function.
 * - ProcessContentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

const ProcessContentInputSchema = z.object({
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
  id: z.string().describe("A unique ID for the lesson (e.g., VOCAB_005)."),
  type: z.enum(['Grammar', 'Vocabulary', 'Tips', 'Speaking']),
  title: z.string().describe("A concise, descriptive title for the lesson."),
  level: z.enum(['Basic', 'Intermediate', 'Advanced', 'All Levels']),
  content_en: z.string().describe("The full lesson content in English."),
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
    audioUrl: z.string().url().describe("A placeholder URL for the audio file."),
    transcript: z.string().describe("The full transcript of the audio."),
    questions: z.array(PracticeQuestionSchema),
});


const ProcessContentOutputSchema = z.union([
    LessonSchema,
    ReadingTestSchema,
    ListeningTestSchema
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
  prompt: `You are an expert IELTS curriculum developer. Your task is to analyze the provided raw text and convert it into a structured JSON object.

  First, determine the type of content:
  - If the text is explanatory, about a specific topic like grammar, vocabulary, or exam tips, format it as a 'Lesson'.
  - If the text contains a reading passage followed by questions, format it as a 'ReadingTest'.
  - If the text is a transcript of an audio recording followed by questions, format it as a 'ListeningTest'. For Listening tests, use a placeholder for the audioUrl.

  Then, generate a valid JSON object that strictly adheres to the one of the following schemas based on your determination. Ensure all IDs are unique and follow the examples.

  - Lesson Schema: ${JSON.stringify(LessonSchema.shape)}
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
    return result.output!;
  }
);
