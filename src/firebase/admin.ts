
'use server';

import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

function initializeAdminApp(): App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  console.log('Firebase Admin SDK not initialized, initializing now...');
  try {
    // Read the service account key from the environment variable.
    // This is more robust for different server environments.
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for server-side authentication.');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Add your databaseURL here if you have one, to avoid potential lookup issues
        // databaseURL: `https://<YOUR_PROJECT_ID>.firebaseio.com`
    });

    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

// Export an async function that returns the initialized app instance.
export async function getFirebaseAdmin() {
    return initializeAdminApp();
}
