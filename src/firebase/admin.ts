
'use server';

import * as admin from 'firebase-admin';

// This simplified logic ensures robust initialization.
// It relies on the standard GOOGLE_APPLICATION_CREDENTIALS environment variable,
// which is the correct way to handle auth in server environments like Firebase App Hosting.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // This error is critical for server-side functionality.
    // Ensure that the service account credentials are correctly set up in the environment.
  }
}

export const firebaseAdmin = admin;
