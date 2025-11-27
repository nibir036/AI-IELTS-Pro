'use server';

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

// This simplified logic ensures robust initialization.
// It relies on the standard GOOGLE_APPLICATION_CREDENTIALS environment variable,
// which is the correct way to handle auth in server environments like Firebase App Hosting.
function initializeAdminApp(): App {
  // Check if the app is already initialized to prevent errors
  if (admin.apps.length > 0) {
    const existingApp = admin.apps[0];
    if (existingApp) {
        return existingApp;
    }
  }

  // If not initialized, create a new app instance.
  // This will automatically use the service account credentials from the environment.
  console.log('Firebase Admin SDK not initialized, initializing now...');
  try {
    const app = admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // This error is critical for server-side functionality.
    // Ensure that the service account credentials are correctly set up in the environment.
    // Re-throw the error to make the failure visible during server startup.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

// Export a function that returns the initialized app instance.
export async function getFirebaseAdmin() {
    return initializeAdminApp();
}
