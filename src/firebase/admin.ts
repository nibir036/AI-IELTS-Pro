
'use server';

import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization errors.
if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment (like Firebase Studio),
    // calling initializeApp() without arguments allows the SDK to automatically
    // detect the service account and project configuration, including the
    // correct default storage bucket. This is the most reliable method.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully using application default credentials.');
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // This catch block handles cases where automatic initialization might fail,
    // for example, in a local development environment without proper credentials.
    // The error message will provide guidance on how to set up local credentials.
  }
}

export const firebaseAdmin = admin;
