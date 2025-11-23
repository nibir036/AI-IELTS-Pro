'use server';

import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { firebaseAdmin } from '@/firebase/admin'; // Ensure admin is initialized

/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/wav').
 * @param filePath The full desired path for the file in the bucket (e.g., 'listeningTests/my-test-id/my-test-id.wav').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, filePath: string): Promise<string> {
    try {
        const bucket = getStorage().bucket("studio-161365104-8c7c1.appspot.com"); 
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        const file = bucket.file(filePath);

        await file.save(audioBuffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                  firebaseStorageDownloadTokens: uuidv4(),
                }
            },
        });
        
        await file.makePublic();
        const publicUrl = file.publicUrl();
        
        console.log(`Successfully uploaded audio. Public URL: ${publicUrl}`);
        return publicUrl;

    } catch (uploadError: any) {
        console.error("CRITICAL: Failed to upload audio to Firebase Storage.", uploadError);
        console.error("Bucket operations might be failing. Check service account permissions for 'Storage Object Admin'. This could be an authentication issue with the Admin SDK.");
        
        return "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
    }
}
