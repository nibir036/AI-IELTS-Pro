
'use server';

/**
 * @fileOverview A Genkit flow for processing raw text into structured lesson content.
 *
 * - processContentIntoLesson - A function that handles the lesson creation process.
 * - ProcessContentInput - The input type for the function.
 * - ProcessContentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

const ProcessContentInputSchema = z.object({
  rawText: z.string().describe('The raw text content from a book chapter or article to be processed.'),
});
export type ProcessContentInput = z.infer<typeof ProcessContentInputSchema>;


const PracticeQuestionSchema = z.object({
  question: z.string().describe("The question text."),
  type: z.string().describe("The type of question (e.g., 'multiple-choice', 'fill-in-the-blank', 'true-false')."),
  answer: z.string().describe("The correct answer to the question."),
  options: z.array(z.string()).optional().describe("A list of options for multiple-choice questions.")
});

const ProcessContentOutputSchema = z.object({
  title: z.string().describe("A concise, descriptive title for the lesson based on the text."),
  explanation: z.string().describe("A core explanation or summary of the lesson content."),
  practiceQuestions: z.array(PracticeQuestionSchema).length(3).describe("An array of exactly three IELTS-style practice questions based on the text."),
});
export type ProcessContentOutput = z.infer<typeof ProcessContentOutputSchema>;


export async function processContentIntoLesson(
  input: ProcessContentInput
): Promise<ProcessContentOutput> {
  return contentFactoryFlow(input);
}


const prompt = ai.definePrompt({
  name: 'contentFactoryPrompt',
  input: { schema: ProcessContentInputSchema },
  output: { schema: ProcessContentOutputSchema },
  prompt: `You are an expert IELTS curriculum developer. Analyze the following text as an IELTS lesson. Your task is to:
1.  Extract a clear, concise topic title.
2.  Write a core explanation of the main concepts suitable for an IELTS student.
3.  Generate exactly 3 IELTS-style practice questions based on the provided text.

Return the result as a single, valid JSON object that strictly adheres to the following schema: {{outputSchema}}

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
