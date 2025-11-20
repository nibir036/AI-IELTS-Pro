
'use server';

/**
 * @fileOverview AI-powered speaking evaluation flow.
 *
 * - aiPoweredSpeakingEvaluation - A function that handles the speaking evaluation process.
 * - AiPoweredSpeakingEvaluationInput - The input type for the aiPoweredSpeakingEvaluation function.
 * - AiPoweredSpeakingEvaluationOutput - The return type for the aiPoweredSpeakingEvaluation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

const AiPoweredSpeakingEvaluationInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'A recorded audio of the user speaking, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' + 
      'The audio should be of reasonable length (e.g., 1-2 minutes) for effective evaluation.'
    ),
  task: z.string().describe('The speaking task or question the user responded to.'),
});

export type AiPoweredSpeakingEvaluationInput = z.infer<typeof AiPoweredSpeakingEvaluationInputSchema>;

const AiPoweredSpeakingEvaluationOutputSchema = z.object({
  overallFeedback: z.string().describe('Overall feedback on the user\'s speaking performance.'),
  pronunciationFeedback: z.string().describe('Detailed feedback on the user\'s pronunciation.'),
  fluencyFeedback: z.string().describe('Detailed feedback on the user\'s fluency.'),
  coherenceFeedback: z.string().describe('Detailed feedback on the user\'s coherence and cohesion.'),
  grammarFeedback: z.string().describe('Detailed feedback on the user\'s grammar.'),
  vocabularyFeedback: z.string().describe('Detailed feedback on the user\'s vocabulary.'),
  scoreBand: z.number().describe('The estimated IELTS band score for the speaking performance.'),
});

export type AiPoweredSpeakingEvaluationOutput = z.infer<typeof AiPoweredSpeakingEvaluationOutputSchema>;

export async function aiPoweredSpeakingEvaluation(
  input: AiPoweredSpeakingEvaluationInput
): Promise<AiPoweredSpeakingEvaluationOutput> {
  return aiPoweredSpeakingEvaluationFlow(input);
}

const aiPoweredSpeakingEvaluationPrompt = ai.definePrompt({
  name: 'aiPoweredSpeakingEvaluationPrompt',
  input: {schema: AiPoweredSpeakingEvaluationInputSchema},
  output: {schema: AiPoweredSpeakingEvaluationOutputSchema},
  prompt: `You are a highly experienced IELTS speaking examiner. Evaluate the student's speaking performance based on the audio recording and the task they were responding to.

  Provide detailed feedback on the following aspects:
  - Pronunciation: Clarity, accuracy, and naturalness of pronunciation.
  - Fluency: Smoothness and speed of speech.
  - Coherence and Cohesion: Logical organization and connection of ideas.
  - Grammar: Accuracy and range of grammatical structures.
  - Vocabulary: Appropriateness and range of vocabulary.

  Also give a estimated scoreBand.
  Based on the following task:
  {{{task}}}

  Audio: {{media url=audioDataUri}}
  Output a JSON object following this schema: {{outputSchema}}`,
});

const aiPoweredSpeakingEvaluationFlow = ai.defineFlow(
  {
    name: 'aiPoweredSpeakingEvaluationFlow',
    inputSchema: AiPoweredSpeakingEvaluationInputSchema,
    outputSchema: AiPoweredSpeakingEvaluationOutputSchema,
  },
  async input => {
    // Wrap the AI call with the retry utility
    const result = await withRetry(() => aiPoweredSpeakingEvaluationPrompt(input), {
      retryOn: isRetryableGoogleAIError,
    });
    return result.output!;
  }
);
