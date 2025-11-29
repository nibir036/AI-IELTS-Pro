
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
import { withRetry, isRetryableGoogleAIError } from '@/lib/retry';

const GetTranslationInputSchema = z.object({
  text: z.string().describe('The English text to translate, which may contain HTML <b> tags.'),
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
  prompt: `You are an expert language tutor creating bilingual learning materials for an English learner whose native language is {{{nativeLanguage}}}.

Your task is to translate an English grammatical explanation into a helpful, mixed-language format.

**Rules:**
1.  **Preserve English Keywords:** Do NOT translate common, universal English grammatical terms. For example, keep words like "verb", "noun", "adjective", "Present Simple", "Past Continuous", "Progressive Tense", etc., in English.
2.  **Preserve HTML Formatting:** The input text may contain bold tags like "<b>perfect tenses</b>". When you translate the text, you MUST wrap the corresponding translated phrase in bold tags as well. For example, if "perfect tenses" translates to "পারফেক্ট টেন্স", the output must contain "<b>পারফেক্ট টেন্স</b>".
3.  **Translate Explanations:** Translate the conceptual explanations and descriptive text surrounding the English keywords and bolded phrases into {{{nativeLanguage}}}.
4.  **Create a Natural Mix:** The final output should be a natural blend of {{{nativeLanguage}}} and English, making it easy for a learner to understand the concept while learning the correct English terminology.

**Example for a Bengali speaker:**
*   **English Input:** "Continuous tenses, also known as progressive tenses, describe actions that are in progress at a specific point in time."
*   **Correct {{{nativeLanguage}}} Output:** "Continuous tense (যা progressive tense নামেও পরিচিত) এমন কাজ বা ঘটনা বর্ণনা করে যা একটি নির্দিষ্ট সময়ে চলছে বা in progress থাকে।"

---

**English Text to Translate:**
"{{{text}}}"`,
});

const getTranslationFlow = ai.defineFlow(
  {
    name: 'getTranslationFlow',
    inputSchema: GetTranslationInputSchema,
    outputSchema: GetTranslationOutputSchema,
  },
  async input => {
    // Wrap the AI call with the retry utility
    const result = await withRetry(() => prompt(input), {
      retryOn: isRetryableGoogleAIError,
    });
    return result.output!;
  }
);
