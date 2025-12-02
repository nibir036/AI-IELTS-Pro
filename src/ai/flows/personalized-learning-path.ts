
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
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

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
  prompt: `You are an expert IELTS tutor. Your task is to create a personalized learning path by selecting relevant lesson IDs from a predefined list.

Here is the list of available lesson IDs:
- GRAMMAR_001
- GRAMMAR_002
- GRAMMAR_003
- GRAMMAR_004
- VOCAB_001
- VOCAB_002
- VOCAB_003
- VOCAB_004
- TIPS_001
- TIPS_002
- TIPS_003
- TIPS_004
- SPEAKING_001
- SPEAKING_002
- SPEAKING_003
- SPEAKING_004
- SPEAKING_005

Based on the student's current band score of {{currentBand}}, their target of {{targetBand}}, and their native language of {{nativeLanguage}}, select the most appropriate lesson IDs from the list above.

**Rules:**
1.  **ONLY output lesson IDs from the list provided.** Do not invent new IDs.
2.  Your output MUST be a valid JSON array of strings matching the 'lessonIds' schema.
3.  Select a variety of lessons covering grammar, vocabulary, and tips that would be most beneficial for a user trying to bridge the gap between their current and target scores.

Example Output:
{
  "lessonIds": ["GRAMMAR_002", "VOCAB_001", "TIPS_002"]
}
`,
});

const personalizedLearningPathFlow = ai.defineFlow(
  {
    name: 'personalizedLearningPathFlow',
    inputSchema: PersonalizedLearningPathInputSchema,
    outputSchema: PersonalizedLearningPathOutputSchema,
  },
  async input => {
    // Wrap the AI call with the retry utility
    const result = await withRetry(() => personalizedLearningPathPrompt(input), {
      retryOn: isRetryableGoogleAIError,
    });
    return result.output!;
  }
);

