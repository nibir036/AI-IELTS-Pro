'use server';

/**
 * @fileOverview AI-powered speaking evaluation flow. This flow receives an audio file path
 * from Firebase Storage and performs AI evaluation.
 *
 * - evaluateSpeaking - A function that handles the speaking evaluation process.
 * - EvaluateSpeakingInput - The input type for the evaluateSpeaking function.
 * - AiPoweredSpeakingEvaluationOutput - The return type for the AI evaluation part.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';
import { getAdminStorage } from '@/firebase/admin';

// Schema for the direct input to this flow, which is now the file path
const EvaluateSpeakingInputSchema = z.object({
  filePath: z
    .string()
    .describe(
      "Full path of the user's recorded audio in Firebase Storage (e.g., 'speaking-submissions/userId/file.wav')."
    ),
  task: z.string().describe('The speaking task or question the user responded to.'),
});
export type EvaluateSpeakingInput = z.infer<typeof EvaluateSpeakingInputSchema>;


// Schema for the structured output from the AI model
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


// The main exported function that client components will call.
export async function evaluateSpeaking(
  input: EvaluateSpeakingInput
): Promise<AiPoweredSpeakingEvaluationOutput> {
  return speakingEvaluationFlow(input);
}

const aiPoweredSpeakingEvaluationPrompt = ai.definePrompt({
  name: 'aiPoweredSpeakingEvaluationPrompt',
  input: { schema: z.object({
    task: z.string(),
    audioUrl: z.string().url(), // The prompt still needs a URL
  })},
  output: { schema: AiPoweredSpeakingEvaluationOutputSchema },
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

  Audio: {{media url=audioUrl}}
  Output a JSON object following this schema: {{outputSchema}}`,
});

const speakingEvaluationFlow = ai.defineFlow(
  {
    name: 'speakingEvaluationFlow',
    inputSchema: EvaluateSpeakingInputSchema,
    outputSchema: AiPoweredSpeakingEvaluationOutputSchema,
  },
  async (input) => {
    console.log("Generating signed URL for AI evaluation...");
    
    // 1. Get a reference to the storage file using the Admin SDK
    const storage = getAdminStorage();
    const bucket = storage.bucket(); // Bucket is automatically inferred from initialization
    const file = bucket.file(input.filePath);
    
    // 2. Generate a short-lived signed URL for the AI to access the file
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    console.log("Sending signed audio URL to AI for evaluation...");
    const aiResult = await withRetry(() => aiPoweredSpeakingEvaluationPrompt({
        task: input.task,
        audioUrl: signedUrl, // Use the signed URL
    }), {
      retryOn: isRetryableGoogleAIError,
    });
    
    if (!aiResult.output) {
        throw new Error("Failed to get a valid response from the AI model.");
    }

    return aiResult.output;
  }
);
