import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/firebase/admin';

// Initialize Firebase Admin first, so the plugin can use it.
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: 'googleai/gemini-2.5-flash',
});
