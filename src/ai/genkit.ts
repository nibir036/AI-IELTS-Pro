
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase/plugin';
import { getFirebaseAdmin } from '@/firebase/admin';

// Initialize Firebase Admin first, so the plugin can use it.
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
    // Add the firebase() plugin to handle server-side authentication for Firestore.
    firebase(),
  ],
  model: 'googleai/gemini-2.5-flash',
});
