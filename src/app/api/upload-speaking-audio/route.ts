'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin, getAdminStorage } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        // Ensure Firebase Admin is initialized before using any of its services.
        getFirebaseAdmin();

        const formData = await req.formData();
        const file = formData.get('audio') as Blob | null;
        const userId = formData.get('userId') as string | null;

        if (!file || !userId) {
            return NextResponse.json({ error: 'Missing audio file or user ID.' }, { status: 400 });
        }
        
        const uniqueFilename = `${uuidv4()}.wav`;
        const filePath = `speaking-submissions/${userId}/${uniqueFilename}`;
        
        const buffer = Buffer.from(await file.arrayBuffer());

        const storage = getAdminStorage();
        const bucket = storage.bucket(); 
        const fileUpload = bucket.file(filePath);
        
        await fileUpload.save(buffer, {
            metadata: {
                contentType: file.type || 'audio/wav',
            },
        });

        console.log(`Backend upload successful. File path: ${filePath}`);

        // Return the file path so the client can trigger the evaluation flow.
        return NextResponse.json({ filePath: filePath }, { status: 200 });

    } catch (error: any) {
        console.error('[API/UPLOAD-SPEAKING-AUDIO] Error:', error);
        // Ensure a clear JSON error response is always sent, even on failure.
        return NextResponse.json(
            { error: error.message || 'An internal server error occurred during file upload.' },
            { status: 500 }
        );
    }
}
