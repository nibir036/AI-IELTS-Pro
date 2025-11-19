'use server';

/**
 * @fileOverview AI-powered writing evaluation flow for IELTS/PTE submissions.
 *
 * - aiPoweredWritingEvaluation - A function that handles the writing evaluation process.
 * - AiPoweredWritingEvaluationInput - The input type for the aiPoweredWritingEvaluation function.
 * - AiPoweredWritingEvaluationOutput - The return type for the aiPoweredWritingEvaluation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiPoweredWritingEvaluationInputSchema = z.object({
  task: z.string().describe('The writing task for the essay.'),
  studentEssay: z.string().describe('The student\'s essay submission.'),
});
export type AiPoweredWritingEvaluationInput = z.infer<
  typeof AiPoweredWritingEvaluationInputSchema
>;

const AiPoweredWritingEvaluationOutputSchema = z.object({
  overallBand: z.number().describe('The overall band score for the essay.'),
  feedbackSummary: z
    .string()
    .describe('A summary of the feedback for the essay.'),
  criterionScores: z.object({
    taskResponse: z.object({
      band: z.number().describe('The band score for task response.'),
      comment: z.string().describe('Comments on the task response.'),
    }),
    coherenceCohesion: z.object({
      band: z.number().describe('The band score for coherence and cohesion.'),
      comment: z.string().describe('Comments on coherence and cohesion.'),
    }),
    lexicalResource: z.object({
      band: z.number().describe('The band score for lexical resource.'),
      comment: z.string().describe('Comments on lexical resource.'),
    }),
    grammaticalRangeAccuracy: z.object({
      band: z
        .number()
        .describe('The band score for grammatical range and accuracy.'),
      comment: z
        .string()
        .describe('Comments on grammatical range and accuracy.'),
    }),
  }),
  improvementAreas: z.array(
    z.object({
      type: z.string().describe('The type of improvement area.'),
      rule: z.string().describe('The rule for improvement.'),
      example: z.string().describe('An example of the improvement area.'),
    })
  ),
  correctedEssay: z.string().describe('The corrected essay.'),
});
export type AiPoweredWritingEvaluationOutput = z.infer<
  typeof AiPoweredWritingEvaluationOutputSchema
>;

export async function aiPoweredWritingEvaluation(
  input: AiPoweredWritingEvaluationInput
): Promise<AiPoweredWritingEvaluationOutput> {
  return aiPoweredWritingEvaluationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiPoweredWritingEvaluationPrompt',
  input: {schema: AiPoweredWritingEvaluationInputSchema},
  output: {schema: AiPoweredWritingEvaluationOutputSchema},
  prompt: `You are a highly experienced, certified IELTS examiner. You must adhere strictly to the four public IELTS band descriptors (Task Response, Coherence/Cohesion, Lexical Resource, Grammatical Range/Accuracy) when evaluating the essay.

Evaluate the following IELTS Writing Task 2 essay based on the provided task. Provide a structured JSON object as output.

Task: {{{task}}}

Student Essay: {{{studentEssay}}}

Output Format:
\'\'\'json
{
  "overallBand": (Number),
  "feedbackSummary": (String),
  "criterionScores": {
    "taskResponse": {"band": (Number), "comment": (String)},
    "coherenceCohesion": {"band": (Number), "comment": (String)},
    "lexicalResource": {"band": (Number), "comment": (String)},
    "grammaticalRangeAccuracy": {"band": (Number), "comment": (String)}
  },
  "improvementAreas": [
    {"type": "Grammar", "rule": "Subordinating conjunctions", "example": "The student should practice using complex sentences with 'although' and 'while'."},
    {"type": "Vocabulary", "rule": "Nominalization", "example": "Replace verb forms with noun forms: 'It is important to analyze...' -> 'The analysis is important...'."}
  ],
  "correctedEssay": (String)
}
\'\'\'`,
});

const aiPoweredWritingEvaluationFlow = ai.defineFlow(
  {
    name: 'aiPoweredWritingEvaluationFlow',
    inputSchema: AiPoweredWritingEvaluationInputSchema,
    outputSchema: AiPoweredWritingEvaluationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
