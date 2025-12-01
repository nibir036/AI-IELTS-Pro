
'use server';

import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseAdmin } from '@/firebase/admin'; 
import { initializeFirebase } from '@/firebase';


/**
 * Uploads a file blob from the client to Firebase Storage and returns the public URL.
 * THIS IS A CLIENT-SIDE FUNCTION. It uses the client SDK.
 * @param blob The file blob to upload.
 * @param filePath The full desired path for the file in the bucket (e.g., 'speaking-submissions/userId/some-file.wav').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioFromClient(blob: Blob, filePath: string): Promise<string> {
    const { firestore, auth } = initializeFirebase(); // Get client-side storage instance
    const storage = getStorage();
    const storageRef = ref(storage, filePath);

    try {
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`Client-side upload successful. URL: ${downloadUrl}`);
        return downloadUrl;
    } catch (error) {
        console.error("Client-side upload failed:", error);
        throw new Error("Failed to upload audio to storage from client.");
    }
}


// This function remains for server-to-server operations if needed, but is not used for user uploads.
async function uploadToStorage(
    base64Data: string, 
    contentType: string, 
    filePath: string
): Promise<string> {
    const adminApp = await getFirebaseAdmin();
    const bucket = getAdminStorage(adminApp).bucket("studio-161365104-8c7c1.appspot.com");
    const buffer = Buffer.from(base64Data, 'base64');
    const file = bucket.file(filePath);

    const token = uuidv4();
    await file.save(buffer, {
        metadata: {
            contentType: contentType,
            metadata: {
              firebaseStorageDownloadTokens: token,
            }
        }
    });
    
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
    
    console.log(`Successfully uploaded file via Admin SDK. Public URL: ${publicUrl}`);
    return publicUrl;
}


/**
 * [SERVER-SIDE ONLY] Uploads a base64 encoded audio string to Firebase Storage and returns the public URL.
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
        return "https://storage.googleapis.com/aidemos/devrel_and_partners/AI%20Band%20Builder/placeholder_audio_1.mp3";
    }
}


/**
 * [SERVER-SIDE ONLY] Uploads a base64 encoded image string to Firebase Storage and returns the public URL.
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
        return "https://picsum.photos/seed/error/600/400";
    }
}
