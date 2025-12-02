
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { User } from 'firebase/auth';

/**
 * Uploads a file blob from the client to Firebase Storage.
 * THIS IS A CLIENT-SIDE FUNCTION. It uses the client SDK.
 * @param blob The file blob to upload.
 * @param filePath The full desired path for the file in the bucket (e.g., 'speaking-submissions/userId/some-file.wav').
 * @param user The currently authenticated Firebase user object.
 * @returns An object containing the public URL and the storage path of the uploaded file.
 */
export async function uploadAudioFromClient(blob: Blob, filePath: string, user: User): Promise<{ publicUrl: string, path: string }> {
    
    if (!user) {
        throw new Error("User is not authenticated. Cannot upload file.");
    }
    
    // This now correctly gets the client-side app instance with the proper config.
    const { firebaseApp } = initializeFirebase(); 
    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, filePath);

    try {
        console.log(`Starting client-side upload to: ${filePath}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`Client-side upload successful. URL: ${downloadUrl}`);
        return { publicUrl: downloadUrl, path: snapshot.ref.fullPath };
    } catch (error: any) {
        console.error("Client-side upload failed:", error);
         if (error.code === 'storage/unauthorized' || error.message?.includes('CORS')) {
            const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_BUCKET_NAME";
            const detailedError = `Upload failed due to a CORS policy error. This is a server configuration issue. Please run 'gsutil cors set cors.json gs://${bucketName}' in your terminal to fix it. See the README for more details.`;
            throw new Error(detailedError);
        }
        // It's crucial to re-throw the error so the calling component knows about the failure.
        throw new Error(`Failed to upload audio to storage from client: ${error.message}`);
    }
}

