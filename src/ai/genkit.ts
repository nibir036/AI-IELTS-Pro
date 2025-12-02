
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/firebase/admin';
import { firebasePlugin } from '@genkit-ai/firebase';

// Initialize Firebase Admin first (this loads service account)
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
    firebasePlugin({
      adminSdk: true, // Use Firebase Admin SDK
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
