'use server';

/**
 * @fileOverview A multilingual support AI agent that provides initial instructions and explanations in the user's native language.
 *
 * - getTranslation - A function that handles the translation process.
 * - GetTranslationInput - The input type for the getTranslation function.
 * - GetTranslationOutput - The return type for the getTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetTranslationInputSchema = z.object({
  text: z.string().describe('The English text to translate.'),
  nativeLanguage: z.string().describe('The native language to translate to.'),
});
export type GetTranslationInput = z.infer<typeof GetTranslationInputSchema>;

const GetTranslationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text in the native language.'),
});
export type GetTranslationOutput = z.infer<typeof GetTranslationOutputSchema>;

export async function getTranslation(input: GetTranslationInput): Promise<GetTranslationOutput> {
  return getTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTranslationPrompt',
  input: {schema: GetTranslationInputSchema},
  output: {schema: GetTranslationOutputSchema},
  prompt: `Translate the following English text to {{{nativeLanguage}}}:\n\n{{{text}}}`,
});

const getTranslationFlow = ai.defineFlow(
  {
    name: 'getTranslationFlow',
    inputSchema: GetTranslationInputSchema,
    outputSchema: GetTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
