
'use server';

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment (like Firebase Studio),
    // this will use the service account attached to the environment.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // This provides a fallback for local development if GOOGLE_APPLICATION_CREDENTIALS is not set.
    // However, in the Studio environment, the first block should always succeed.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log("Attempting to initialize with service account from environment variables.");
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("Firebase Admin SDK initialization failed. No credentials found.");
    }
  }
}

export const firebaseAdmin = admin;
