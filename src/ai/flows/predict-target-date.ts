'use server';

/**
 * @fileOverview Predicts the date a user will achieve their target IELTS band score.
 *
 * - predictTargetDate - A function that handles the prediction logic.
 * - PredictTargetDateInput - The input type for the predictTargetDate function.
 * - PredictTargetDateOutput - The return type for the predictTargetDate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Submission } from '@/lib/types';

const SubmissionSummarySchema = z.object({
  skill: z.string(),
  scoreBand: z.number().nullable(),
  timestamp: z.date(),
});

const PredictTargetDateInputSchema = z.object({
  currentBand: z.number().describe("The user's current IELTS band score."),
  targetBand: z.number().describe("The user's target IELTS band score."),
  submissions: z.array(SubmissionSummarySchema).describe("A list of the user's recent practice submissions, including skill, score, and date."),
});
export type PredictTargetDateInput = z.infer<typeof PredictTargetDateInputSchema>;

const PredictTargetDateOutputSchema = z.object({
  predictedDate: z.string().describe("The predicted date (YYYY-MM-DD) when the user will achieve their target band score."),
  reasoning: z.string().describe("A brief explanation for the prediction, based on the user's progress and practice frequency."),
});
export type PredictTargetDateOutput = z.infer<typeof PredictTargetDateOutputSchema>;

export async function predictTargetDate(input: PredictTargetDateInput): Promise<PredictTargetDateOutput> {
  return predictTargetDateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictTargetDatePrompt',
  input: {schema: PredictTargetDateInputSchema},
  output: {schema: PredictTargetDateOutputSchema},
  prompt: `You are an expert IELTS tutor and data analyst. Your task is to predict the date when a student will achieve their target band score.

Consider the following factors:
- The gap between their current band ({{currentBand}}) and target band ({{targetBand}}).
- The frequency and consistency of their practice sessions (submissions).
- Their rate of improvement based on the scores in their submissions.
- Assume that a consistent student practicing multiple times a week can improve by 0.5 band points every 4-6 weeks. Adjust this based on their actual submission history.

Here is the user's recent submission history:
{{#each submissions}}
- {{skill}} practice on {{timestamp}} with a score of {{scoreBand}}.
{{/each}}

Based on this data, predict the date (in YYYY-MM-DD format) they will reach their target score. Provide a short, encouraging reasoning for your prediction. If there is not enough data, make a conservative estimate and mention that more practice will provide a more accurate forecast.`,
});

const predictTargetDateFlow = ai.defineFlow(
  {
    name: 'predictTargetDateFlow',
    inputSchema: PredictTargetDateInputSchema,
    outputSchema: PredictTargetDateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
