
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import path from "path";
import fs from 'fs';

let app: App;
let serviceAccount: Record<string, any>;

function getServiceAccount() {
    if (!serviceAccount) {
        try {
             const serviceAccountPath = path.resolve(
                process.cwd(),
                process.env.GOOGLE_APPLICATION_CREDENTIALS!
            );
            const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
            serviceAccount = JSON.parse(serviceAccountFile);
        } catch (error: any) {
             console.error("CRITICAL: Could not read or parse service account file.", error);
             throw new Error(`Failed to load service account: ${error.message}`);
        }
    }
    return serviceAccount;
}


export function getFirebaseAdmin() {
  if (!getApps().length) {
    try {
        const sa = getServiceAccount();
        app = initializeApp({
          credential: cert(sa),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });

        console.log("🔥 Firebase Admin initialized");
    } catch (error: any) {
        console.error("CRITICAL: Firebase Admin SDK initialization failed.", error);
        throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getAdminFirestore() {
  getFirebaseAdmin();
  return getFirestore();
}

export function getAdminStorage() {
  getFirebaseAdmin();
  return getStorage();
}

export function getAdminProjectId(): string {
    const sa = getServiceAccount();
    if (!sa.project_id) {
        throw new Error("`project_id` not found in service account file.");
    }
    return sa.project_id;
}
