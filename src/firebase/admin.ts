
'use server';

import { config } from 'dotenv';
config();

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

function initializeAdminApp(): App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  console.log('Firebase Admin SDK not initialized, initializing now...');
  try {
    // In a hosted Google Cloud environment (like App Hosting),
    // the SDK can automatically discover credentials without any arguments.
    // It falls back to GOOGLE_APPLICATION_CREDENTIALS locally if set.
    const app = admin.initializeApp();

    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // Provide a more helpful error message for developers.
    let detailedError = `Firebase Admin SDK initialization failed: ${error.message}.`;
    if (error.code === 'app/invalid-credential' || error.message.includes('Could not load the default credentials')) {
        detailedError += "\n\n[Developer Tip] This often happens when GOOGLE_APPLICATION_CREDENTIALS environment variable is not set for local development. Make sure it points to your service account JSON file.";
    }
    throw new Error(detailedError);
  }
}

// Export an async function that returns the initialized app instance.
export async function getFirebaseAdmin() {
    return initializeAdminApp();
}
