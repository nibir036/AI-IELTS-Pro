import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { firebaseAdmin } from "@genkit-ai/firebase";
import { getFirebaseAdmin } from "@/firebase/admin";

// Ensure Firebase Admin is initialized BEFORE Genkit
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
    firebaseAdmin(),
  ],
  model: "googleai/gemini-2.5-flash",
});
