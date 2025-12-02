
'use server';

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

// This is a placeholder for local development. In a deployed Google environment,
// credentials will be discovered automatically.
const serviceAccount = {};

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
    // When deployed, the SDK automatically discovers credentials.
    // For local development, it will use a placeholder which may result in an
    // error if GOOGLE_APPLICATION_CREDENTIALS is not set, which is expected.
    const credential = process.env.NODE_ENV === 'production' 
      ? undefined 
      : admin.credential.cert(serviceAccount as any);

    const app = admin.initializeApp({ credential });
    
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // Re-throw the error to make it clear that server-side operations will fail.
    // This is better than returning a dummy object which causes downstream type errors.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}. Ensure GOOGLE_APPLICATION_CREDENTIALS is set for local development.`);
  }
}
