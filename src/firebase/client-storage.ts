
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

/**
 * Uploads a file blob from the client to Firebase Storage and returns the public URL.
 * THIS IS A CLIENT-SIDE FUNCTION. It uses the client SDK.
 * @param blob The file blob to upload.
 * @param filePath The full desired path for the file in the bucket (e.g., 'speaking-submissions/userId/some-file.wav').
 * @returns The public URL of the uploaded file.
 */
export async function uploadAudioFromClient(blob: Blob, filePath: string): Promise<string> {
    // This function must run on the client, so it's safe to initialize here.
    // The initializeFirebase function handles singleton pattern.
    const { firebaseApp } = initializeFirebase(); 
    const storage = getStorage(firebaseApp);
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
