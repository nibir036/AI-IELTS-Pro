
'use server';

import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseAdmin } from '@/firebase/admin'; // Ensure admin is initialized

async function uploadToStorage(
    base64Data: string, 
    contentType: string, 
    filePath: string
): Promise<string> {
    const adminApp = await getFirebaseAdmin();
    const bucket = getStorage(adminApp).bucket("studio-161365104-8c7c1.appspot.com");
    const buffer = Buffer.from(base64Data, 'base64');
    const file = bucket.file(filePath);

    const token = uuidv4();
    // The 'metadata' object within the options now includes another 'metadata' field for the token
    await file.save(buffer, {
        metadata: {
            contentType: contentType,
            // Generate a download token to ensure public access via URL
            metadata: {
              firebaseStorageDownloadTokens: token,
            }
        }
    });
    
    // The public URL format is different from the gs:// URI
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
    
    console.log(`Successfully uploaded file. Public URL: ${publicUrl}`);
    return publicUrl;
}


/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/wav').
 * @param filePath The full desired path for the file in the bucket (e.g., 'listeningTests/my-test-id/my-test-id.wav').
 * @returns The public URL of the uploaded file, or a placeholder URL on failure.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, filePath: string): Promise<string> {
    try {
        return await uploadToStorage(base64Audio, contentType, filePath);
    } catch(e) {
        console.error("Audio upload failed, returning placeholder.", e);
        // Return a known, safe placeholder URL that is whitelisted in next.config.js
        return "https://storage.googleapis.com/aidemos/devrel_and_partners/AI%20Band%20Builder/placeholder_audio_1.mp3";
    }
}


/**
 * Uploads a base64 encoded image string to Firebase Storage and returns the public URL.
 * @param base64Image The base64 encoded image data (without the data URI prefix).
 * @param contentType The MIME type of the image (e.g., 'image/jpeg').
 * @param filePath The full desired path for the file in the bucket.
 * @returns The public URL of the uploaded file, or a placeholder URL on failure.
 */
export async function uploadImageToStorage(base64Image: string, contentType: string, filePath: string): Promise<string> {
     try {
        return await uploadToStorage(base64Image, contentType, filePath);
    } catch(e) {
        console.error("Image upload failed, returning placeholder.", e);
        // Return a known, safe placeholder URL that is whitelisted in next.config.js
        return "https://picsum.photos/seed/error/600/400";
    }
}
