
'use server';

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import { serviceAccount } from './service-account.json';

/**
 * Gets the initialized Firebase Admin App instance.
 * Ensures that initialization only happens once per server instance.
 * This is the recommended pattern for serverless environments.
 * @returns A promise that resolves with the initialized Firebase Admin App.
 */
export async function getFirebaseAdmin(): Promise<App> {
  // If an app is already initialized, return it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  try {
    // When deployed to a Google Cloud environment (like App Hosting), the SDK
    // can automatically discover credentials. For local development, we need
    // to explicitly provide the service account credentials.
    const credential = process.env.NODE_ENV === 'production' 
      ? undefined 
      : admin.credential.cert(serviceAccount);
      
    const app = admin.initializeApp({ credential });
    
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    let detailedError = `Firebase Admin SDK initialization failed: ${error.message}.`;
    if (error.code === 'app/invalid-credential' || error.message.includes('Could not load the default credentials')) {
        detailedError += "\n\n[Developer Tip] This often happens when the GOOGLE_APPLICATION_CREDENTIALS environment variable is not set for local development or the service account file is invalid.";
    }
    throw new Error(detailedError);
  }
}
