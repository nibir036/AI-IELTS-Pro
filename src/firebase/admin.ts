
import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

/**
 * Gets the initialized Firebase Admin App instance.
 * Ensures that initialization only happens once per server instance.
 * This is the recommended pattern for serverless environments.
 * @returns The initialized Firebase Admin App.
 */
export function getFirebaseAdmin(): App {
  // If an app is already initialized, return it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  try {
    // Explicitly initialize with the project ID to ensure the correct
    // default service account is used in this environment.
    const app = admin.initializeApp({
        projectId: 'studio-161365104-8c7c1'
    });
    
    console.log('Firebase Admin SDK initialized successfully for project: studio-161365104-8c7c1');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // Re-throw the error to make it clear that server-side operations will fail.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}.`);
  }
}
