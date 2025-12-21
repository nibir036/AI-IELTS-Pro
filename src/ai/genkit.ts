import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { getFirebaseAdmin } from "@/firebase/admin";

// Ensure Firebase Admin is initialized BEFORE Genkit
getFirebaseAdmin();

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: "googleai/gemini-1.5-pro",
});
