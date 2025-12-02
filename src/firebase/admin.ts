import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import path from "path";

let app: App;

export function getFirebaseAdmin() {
  if (!getApps().length) {
    try {
        const serviceAccountPath = path.resolve(
          process.cwd(),
          process.env.GOOGLE_APPLICATION_CREDENTIALS!
        );

        app = initializeApp({
          credential: cert(serviceAccountPath),
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
