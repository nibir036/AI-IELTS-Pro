
'use server';
/**
 * @fileOverview A Genkit flow for processing uploaded PDF files.
 * It extracts text, chunks it, and saves it to a Firestore "knowledge" collection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import pdf from 'pdf-parse';

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


const ProcessPdfInputSchema = z.object({
  pdfData: z.string().describe("The base64-encoded PDF file content."),
  fileName: z.string().describe("The original name of the PDF file."),
});
export type ProcessPdfInput = z.infer<typeof ProcessPdfInputSchema>;

const ProcessPdfOutputSchema = z.object({
  chunkCount: z.number().describe("The number of text chunks created from the PDF."),
});
export type ProcessPdfOutput = z.infer<typeof ProcessPdfOutputSchema>;


export async function processPdf(input: ProcessPdfInput): Promise<ProcessPdfOutput> {
  return processPdfFlow(input);
}


const processPdfFlow = ai.defineFlow(
  {
    name: 'processPdfFlow',
    inputSchema: ProcessPdfInputSchema,
    outputSchema: ProcessPdfOutputSchema,
  },
  async ({ pdfData, fileName }) => {
    const firestore = (await getFirebaseAdmin()).firestore();
    // 1. Convert base64 PDF data to a buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    
    // 2. Parse the PDF buffer to extract text
    const data = await pdf(pdfBuffer);
    const extractedText = data.text;

    if (!extractedText) {
        throw new Error('Could not extract text from the PDF.');
    }

    // 3. Chunk the extracted text
    const textChunks = chunkText(extractedText, 1000, 200); // 1000-char chunks, 200-char overlap

    // 4. Store each chunk in the 'knowledge' collection in Firestore
    const batch = firestore.batch();
    const knowledgeCollection = firestore.collection('knowledge');

    textChunks.forEach(chunk => {
        const docRef = knowledgeCollection.doc(); // Auto-generate ID
        batch.set(docRef, {
            chunk: chunk,
            sourceFile: fileName,
            createdAt: FieldValue.serverTimestamp(),
        });
    });

    await batch.commit();

    return { chunkCount: textChunks.length };
  }
);

    