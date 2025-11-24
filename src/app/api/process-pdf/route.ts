
import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import pdf from 'pdf-parse';

const firestore = firebaseAdmin.firestore();

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


export async function POST(req: NextRequest) {
    try {
        const { pdfData, fileName } = await req.json();
        
        if (!pdfData || !fileName) {
            return NextResponse.json({ error: 'Missing PDF data or file name.' }, { status: 400 });
        }

        // 1. Convert base64 PDF data to a buffer
        const pdfBuffer = Buffer.from(pdfData, 'base64');
        
        // 2. Parse the PDF buffer to extract text
        const data = await pdf(pdfBuffer);
        const extractedText = data.text;

        if (!extractedText) {
             return NextResponse.json({ error: 'Could not extract text from the PDF.' }, { status: 500 });
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

        return NextResponse.json({ message: 'PDF processed successfully.', chunkCount: textChunks.length }, { status: 200 });

    } catch (error: any) {
        console.error('Error processing PDF:', error);
        return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
