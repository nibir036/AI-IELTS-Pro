
'use server';

import { config } from 'dotenv';
config();

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

// This variable will hold the singleton instance of the initialized app.
let adminApp: App | null = null;

async function initializeAdminApp(): Promise<App> {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    console.log('Reusing existing Firebase Admin SDK app instance.');
    adminApp = admin.apps[0] as App;
    return adminApp;
  }

  console.log('Firebase Admin SDK not initialized, initializing now...');
  try {
    // In a hosted Google Cloud environment (like App Hosting),
    // the SDK can automatically discover credentials without any arguments.
    // It falls back to GOOGLE_APPLICATION_CREDENTIALS locally if set.
    adminApp = admin.initializeApp();

    console.log('Firebase Admin SDK initialized successfully.');
    return adminApp;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // Provide a more helpful error message for developers.
    let detailedError = `Firebase Admin SDK initialization failed: ${error.message}.`;
    if (error.code === 'app/invalid-credential' || error.message.includes('Could not load the default credentials')) {
        detailedError += "\n\n[Developer Tip] This often happens when the GOOGLE_APPLICATION_CREDENTIALS environment variable is not set for local development. Make sure it points to your service account JSON file.";
    }
    throw new Error(detailedError);
  }
}

/**
 * Gets the initialized Firebase Admin App instance.
 * Ensures that initialization only happens once.
 * @returns The initialized Firebase Admin App.
 */
export async function getFirebaseAdmin(): Promise<App> {
    // This will either return the existing instance or initialize a new one.
    return initializeAdminApp();
}
