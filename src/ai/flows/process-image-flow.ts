
'use server';
/**
 * @fileOverview A Genkit flow for processing uploaded image files.
 * It extracts text via OCR, chunks it, and saves it to a Firestore "knowledge" collection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirebaseAdmin } from '@/firebase/admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { serverTimestamp } from 'firebase/firestore';


// Helper to chunk text into smaller pieces
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.slice(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}


const ProcessImageInputSchema = z.object({
  imageData: z.string().describe("The base64-encoded image file content."),
  fileName: z.string().describe("The original name of the image file."),
});
export type ProcessImageInput = z.infer<typeof ProcessImageInputSchema>;

const ProcessImageOutputSchema = z.object({
  chunkCount: z.number().describe("The number of text chunks created from the image."),
});
export type ProcessImageOutput = z.infer<typeof ProcessImageOutputSchema>;


export async function processImage(input: ProcessImageInput): Promise<ProcessImageOutput> {
  return processImageFlow(input);
}

const extractTextFromImagePrompt = ai.definePrompt({
    name: 'extractTextFromImagePrompt',
    input: { schema: z.object({ imageDataUri: z.string() }) },
    output: { schema: z.object({ extractedText: z.string() }) },
    prompt: `You are an Optical Character Recognition (OCR) expert. Extract all text from the following image.
  
Image: {{media url=imageDataUri}}
  
Respond with only the extracted text.`,
  });


const processImageFlow = ai.defineFlow(
  {
    name: 'processImageFlow',
    inputSchema: ProcessImageInputSchema,
    outputSchema: ProcessImageOutputSchema,
  },
  async ({ imageData, fileName }) => {
    // 1. Initialize Firebase Admin SDK
    const adminApp = getFirebaseAdmin();
    const firestore = getAdminFirestore(adminApp);
    
    // The model expects a full data URI
    const imageDataUri = `data:image/jpeg;base64,${imageData}`;
    
    // 2. Call the AI model to extract text from the image
    const ocrResult = await extractTextFromImagePrompt({ imageDataUri });

    if (!ocrResult.output || !ocrResult.output.extractedText) {
        throw new Error('Could not extract text from the image.');
    }
    const extractedText = ocrResult.output.extractedText;

    // 3. Chunk the extracted text
    const textChunks = chunkText(extractedText, 1000, 200); // 1000-char chunks, 200-char overlap

    // 4. Store each chunk in the 'knowledge' collection in Firestore using the Admin SDK
    const batch = firestore.batch();
    const knowledgeCollection = firestore.collection('knowledge');

    textChunks.forEach(chunk => {
        const docRef = knowledgeCollection.doc(); // Auto-generate ID
        batch.set(docRef, {
            chunk: chunk,
            sourceFile: fileName,
            createdAt: serverTimestamp(),
        });
    });

    await batch.commit();

    return { chunkCount: textChunks.length };
  }
);
