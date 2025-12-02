
import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

/**
 * Gets the initialized Firebase Admin App instance.
 * Ensures that initialization only happens once per server instance.
 * This is the recommended pattern for serverless environments.
 * @returns A promise that resolves with the initialized Firebase Admin App.
 */
export function getFirebaseAdmin(): App {
  // If an app is already initialized, return it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  try {
    // When no credentials are provided, the SDK automatically discovers them
    // from the environment. This works for both deployed and local emulator environments
    // where GOOGLE_APPLICATION_CREDENTIALS is set.
    const app = admin.initializeApp();
    
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // Re-throw the error to make it clear that server-side operations will fail.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}. Ensure GOOGLE_APPLICATION_CREDENTIALS is set for local development.`);
  }
}
