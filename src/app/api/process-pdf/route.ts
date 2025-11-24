'use server';

import { NextRequest, NextResponse } from 'next/server';
import { processPdf } from '@/ai/flows/process-pdf-flow';


export async function POST(req: NextRequest) {
    try {
        const { pdfData, fileName } = await req.json();
        
        if (!pdfData || !fileName) {
            return NextResponse.json({ error: 'Missing PDF data or file name.' }, { status: 400 });
        }

        // Invoke the Genkit flow to handle the processing
        const result = await processPdf({ pdfData, fileName });

        return NextResponse.json({ message: 'PDF processed successfully.', chunkCount: result.chunkCount }, { status: 200 });

    } catch (error: any) {
        console.error('Error in /api/process-pdf route:', error);
        // Ensure a JSON response is always sent, even on failure
        return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
