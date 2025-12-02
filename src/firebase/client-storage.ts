'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

/**
 * Uploads a file blob from the client to Firebase Storage.
 * THIS IS A CLIENT-SIDE FUNCTION. It uses the client SDK.
 * @param blob The file blob to upload.
 * @param filePath The full desired path for the file in the bucket (e.g., 'speaking-submissions/userId/some-file.wav').
 * @returns An object containing the public URL and the storage path of the uploaded file.
 */
export async function uploadAudioFromClient(blob: Blob, filePath: string): Promise<{ publicUrl: string, path: string }> {
    const { firebaseApp } = initializeFirebase(); 
    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, filePath);

    try {
        console.log(`Starting client-side upload to: ${filePath}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`Client-side upload successful. URL: ${downloadUrl}`);
        return { publicUrl: downloadUrl, path: snapshot.ref.fullPath };
    } catch (error) {
        console.error("Client-side upload failed:", error);
        throw new Error("Failed to upload audio to storage from client.");
    }
}
