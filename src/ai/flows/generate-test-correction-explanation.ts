
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an explanation
 * for an incorrect answer on a Reading or Listening test.
 *
 * The flow takes the question, the user's incorrect answer, the correct answer,
 * and the relevant context (e.g., a reading passage snippet) to generate a
 * helpful explanation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

const GenerateExplanationInputSchema = z.object({
  context: z.string().describe('The relevant text from the reading passage or audio transcript.'),
  question: z.string().describe('The question the user answered.'),
  userAnswer: z.string().describe("The user's incorrect answer."),
  correctAnswer: z.string().describe('The correct answer.'),
});
export type GenerateExplanationInput = z.infer<typeof GenerateExplanationInputSchema>;

const GenerateExplanationOutputSchema = z.object({
  explanation: z.string().describe("A concise explanation of why the correct answer is right and the user's answer is wrong, based on the context."),
});
export type GenerateExplanationOutput = z.infer<typeof GenerateExplanationOutputSchema>;

export async function generateTestCorrectionExplanation(input: GenerateExplanationInput): Promise<GenerateExplanationOutput> {
  return generateTestCorrectionExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestCorrectionExplanationPrompt',
  input: {schema: GenerateExplanationInputSchema},
  output: {schema: GenerateExplanationOutputSchema},
  prompt: `You are an expert IELTS tutor. A student has answered a question incorrectly on a practice test. Your task is to provide a clear and concise explanation for why the correct answer is right.

Base your explanation STRICTLY on the provided context.

Context from the text:
---
{{{context}}}
---

Question: "{{{question}}}"
Student's incorrect answer: "{{{userAnswer}}}"
The correct answer is: "{{{correctAnswer}}}"

Explain why "{{{correctAnswer}}}" is correct by referencing the provided context. Keep the explanation to 1-2 sentences.`,
});


const generateTestCorrectionExplanationFlow = ai.defineFlow(
  {
    name: 'generateTestCorrectionExplanationFlow',
    inputSchema: GenerateExplanationInputSchema,
    outputSchema: GenerateExplanationOutputSchema,
  },
  async input => {
    const result = await withRetry(() => prompt(input), {
      retryOn: isRetryableGoogleAIError,
    });
    return result.output!;
  }
);
