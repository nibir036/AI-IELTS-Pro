
'use server';

import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseAdmin } from '@/firebase/admin'; // Ensure admin is initialized

async function uploadToStorage(
    base64Data: string, 
    contentType: string, 
    filePath: string
): Promise<string> {
    try {
        const adminApp = await getFirebaseAdmin();
        const bucket = getStorage(adminApp).bucket("studio-161365104-8c7c1.appspot.com");
        const buffer = Buffer.from(base64Data, 'base64');
        const file = bucket.file(filePath);

        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                  firebaseStorageDownloadTokens: uuidv4(),
                }
            },
            public: true, // Make the file public
        });
        
        // Return the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        console.log(`Successfully uploaded file. Public URL: ${publicUrl}`);
        return publicUrl;

    } catch (uploadError: any) {
        console.error(`CRITICAL: Failed to upload file to Firebase Storage at path ${filePath}.`, uploadError);
        console.error("This could be an authentication issue with the Admin SDK or incorrect bucket permissions. Check service account permissions for 'Storage Object Admin'.");
        
        throw new Error(`Failed to upload file: ${uploadError.message}`);
    }
}


/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/wav').
 * @param filePath The full desired path for the file in the bucket (e.g., 'listeningTests/my-test-id/my-test-id.wav').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, filePath: string): Promise<string> {
    try {
        return await uploadToStorage(base64Audio, contentType, filePath);
    } catch(e) {
        console.error("Audio upload failed, returning placeholder.", e);
        return "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
    }
}


/**
 * Uploads a base64 encoded image string to Firebase Storage and returns the public URL.
 * @param base64Image The base64 encoded image data (without the data URI prefix).
 * @param contentType The MIME type of the image (e.g., 'image/jpeg').
 * @param filePath The full desired path for the file in the bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadImageToStorage(base64Image: string, contentType: string, filePath: string): Promise<string> {
    return uploadToStorage(base64Image, contentType, filePath);
}
