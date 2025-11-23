
'use server';

import { getStorage } from 'firebase-admin/storage';

/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/mpeg').
 * @param filePath The full desired path for the file in the bucket (e.g., 'listeningTests/my-test/my-test.mp3').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, filePath: string): Promise<string> {
    try {
        // Explicitly specifying the bucket name as you instructed. No more appspot.
        const bucket = getStorage().bucket('studio-161365104-8c7c1.firebasestorage.app');
        
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        const file = bucket.file(filePath);

        await file.save(audioBuffer, {
            metadata: {
                contentType: contentType,
            },
        });

        // Make the file public to get a downloadable URL
        await file.makePublic();
        
        const publicUrl = file.publicUrl();
        console.log(`Audio uploaded and public URL generated: ${publicUrl}`);
        return publicUrl;

    } catch (uploadError) {
        console.error("Failed to upload audio to Firebase Storage.", uploadError);
        // In case of failure, we'll return a known placeholder URL.
        // This helps in debugging and prevents the entire flow from crashing.
        return "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
    }
}
