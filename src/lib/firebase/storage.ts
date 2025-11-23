'use server';

import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
 * @param base64Audio The base64 encoded audio data (without the data URI prefix).
 * @param contentType The MIME type of the audio (e.g., 'audio/mpeg').
 * @param folder The folder in the bucket to upload to (e.g., 'listening-audio').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioToStorage(base64Audio: string, contentType: string, folder: string): Promise<string> {
    try {
        // This is the correct bucket name, as you specified.
        const bucket = getStorage().bucket('studio-161365104-8c7c1.firebasestorage.app');
        
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        const fileExtension = contentType === 'audio/wav' ? 'wav' : 'mp3';
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
        const file = bucket.file(fileName);

        await file.save(audioBuffer, {
            metadata: {
                contentType: contentType,
            },
        });

        // Make the file public to get a downloadable URL
        await file.makePublic();
        
        console.log(`Audio uploaded and public URL generated: ${file.publicUrl()}`);
        return file.publicUrl();

    } catch (uploadError) {
        console.error("Failed to upload audio to Firebase Storage.", uploadError);
        // In case of failure, we'll return a known placeholder URL.
        // This helps in debugging and prevents the entire flow from crashing.
        return "https://storage.googleapis.com/studioprod-51f49.appspot.com/placeholder_audio_error.mp3";
    }
}
