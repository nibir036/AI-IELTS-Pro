
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/firebase/admin';
import { firebase } from '@genkit-ai/firebase';

// Initialize Firebase Admin first (this loads service account)
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
  ],
  model: 'googleai/gemini-2.5-flash',
});
