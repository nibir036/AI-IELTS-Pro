
'use server';

import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/wav').
 * @param filePath The full desired path for the file in the bucket (e.g., 'listeningTests/my-test-id/my-test-id.wav').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, filePath: string): Promise<string> {
    try {
        const bucket = getStorage().bucket(); // Get default bucket, which is now correctly initialized.
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        const file = bucket.file(filePath);

        await file.save(audioBuffer, {
            metadata: {
                contentType: contentType,
                // Add a unique token to the metadata to ensure the URL is always fresh
                // This helps bypass potential caching issues with Google Cloud Storage.
                metadata: {
                  firebaseStorageDownloadTokens: uuidv4(),
                }
            },
            public: true, // Make the file public upon upload
        });
        
        // The publicUrl() method provides a consistent, permanent link.
        const publicUrl = file.publicUrl();
        console.log(`Successfully uploaded audio. Public URL: ${publicUrl}`);
        return publicUrl;

    } catch (uploadError: any) {
        console.error("CRITICAL: Failed to upload audio to Firebase Storage.", uploadError);
        console.error("Bucket operations might be failing. Check service account permissions for 'Storage Object Admin'.");
        
        // Return the specific error placeholder to indicate a failure in the upload process.
        return "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
    }
}
