
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/firebase/admin';

// Initialize Firebase Admin so Firestore/Storage work globally
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
    // ❌ No Firebase plugin exists in @genkit-ai/firebase for this purpose.
    // Admin SDK is initialized globally via getFirebaseAdmin().
  ],
  model: 'googleai/gemini-2.5-flash',
});
