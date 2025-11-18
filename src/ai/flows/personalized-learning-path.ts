'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a personalized learning path based on a user's current and target IELTS band scores.
 *
 * The flow takes the user's current band score and target band score as input, and outputs a personalized learning path.
 * The learning path consists of a list of lesson IDs, tailored to improve the user's skills and achieve their target band score.
 *
 * @interface PersonalizedLearningPathInput - Defines the input schema for the personalized learning path flow.
 * @interface PersonalizedLearningPathOutput - Defines the output schema for the personalized learning path flow.
 * @function generatePersonalizedLearningPath - A function that generates a personalized learning path.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedLearningPathInputSchema = z.object({
  currentBand: z.number().describe('The user\'s current IELTS band score.'),
  targetBand: z.number().describe('The user\'s target IELTS band score.'),
  nativeLanguage: z.string().describe('The user\'s native language.')
});
export type PersonalizedLearningPathInput = z.infer<typeof PersonalizedLearningPathInputSchema>;

const PersonalizedLearningPathOutputSchema = z.object({
  lessonIds: z.array(z.string()).describe('A list of lesson IDs tailored to the user\'s learning path.'),
});
export type PersonalizedLearningPathOutput = z.infer<typeof PersonalizedLearningPathOutputSchema>;

export async function generatePersonalizedLearningPath(input: PersonalizedLearningPathInput): Promise<PersonalizedLearningPathOutput> {
  return personalizedLearningPathFlow(input);
}

const personalizedLearningPathPrompt = ai.definePrompt({
  name: 'personalizedLearningPathPrompt',
  input: {schema: PersonalizedLearningPathInputSchema},
  output: {schema: PersonalizedLearningPathOutputSchema},
  prompt: `You are an expert IELTS tutor. Based on the student's current band score of {{currentBand}} and target band score of {{targetBand}}, create a personalized learning path.

  The learning path should be a list of lesson IDs that will help the student improve their skills and achieve their target band score. Take into account that the student's native language is {{nativeLanguage}}, and suggest lessons that can help them with common mistakes for speakers of that language.

  Return the lesson IDs in a JSON array.
  `,
});

const personalizedLearningPathFlow = ai.defineFlow(
  {
    name: 'personalizedLearningPathFlow',
    inputSchema: PersonalizedLearningPathInputSchema,
    outputSchema: PersonalizedLearningPathOutputSchema,
  },
  async input => {
    const {output} = await personalizedLearningPathPrompt(input);
    return output!;
  }
);
