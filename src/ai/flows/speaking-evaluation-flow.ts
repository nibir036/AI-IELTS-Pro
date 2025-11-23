
'use server';

/**
 * @fileOverview AI-powered speaking evaluation flow. This flow receives audio,
 * uploads it to storage, and then performs AI evaluation.
 *
 * - evaluateSpeaking - A function that handles the speaking evaluation process.
 * - EvaluateSpeakingInput - The input type for the evaluateSpeaking function.
 * - AiPoweredSpeakingEvaluationOutput - The return type for the AI evaluation part.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';
import { uploadAudioToStorage } from '@/lib/firebase/storage';

// Schema for the direct input to this flow
const EvaluateSpeakingInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'A recorded audio of the user speaking, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  task: z.string().describe('The speaking task or question the user responded to.'),
});
export type EvaluateSpeakingInput = z.infer<typeof EvaluateSpeakingInputSchema>;

// Schema for the AI evaluation prompt itself, which uses a URL
const AiPromptInputSchema = z.object({
    audioUrl: z.string().url().describe("Public URL of the user's recorded audio."),
    task: z.string().describe('The speaking task or question the user responded to.'),
});


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

// The final output of the flow, which includes the AI report AND the audio URL
const SpeakingFlowOutputSchema = z.object({
    aiReport: AiPoweredSpeakingEvaluationOutputSchema,
    audioStorageUrl: z.string().url().describe("The public URL where the user's audio is stored."),
});
export type SpeakingFlowOutput = z.infer<typeof SpeakingFlowOutputSchema>;


// The main exported function that client components will call.
export async function evaluateSpeaking(
  input: EvaluateSpeakingInput
): Promise<SpeakingFlowOutput> {
  return speakingEvaluationFlow(input);
}

const aiPoweredSpeakingEvaluationPrompt = ai.definePrompt({
  name: 'aiPoweredSpeakingEvaluationPrompt',
  input: { schema: AiPromptInputSchema },
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
    outputSchema: SpeakingFlowOutputSchema,
  },
  async (input) => {
    // 1. Upload audio to storage
    console.log("Uploading user audio to Firebase Storage...");
    const [header, base64Data] = input.audioDataUri.split(',');
    const contentType = header.split(':')[1].split(';')[0]; // e.g., 'audio/webm'

    if (!base64Data || !contentType) {
        throw new Error("Invalid audio data URI format.");
    }
    const audioUrl = await uploadAudioToStorage(base64Data, contentType, 'speaking-practice');
    console.log(`Audio uploaded to: ${audioUrl}`);

    // 2. Call the AI for evaluation using the public URL
    console.log("Sending audio URL to AI for evaluation...");
    const aiResult = await withRetry(() => aiPoweredSpeakingEvaluationPrompt({
        task: input.task,
        audioUrl: audioUrl,
    }), {
      retryOn: isRetryableGoogleAIError,
    });
    
    if (!aiResult.output) {
        throw new Error("Failed to get a valid response from the AI model.");
    }

    // 3. Return both the AI report and the storage URL
    return {
        aiReport: aiResult.output,
        audioStorageUrl: audioUrl,
    };
  }
);
