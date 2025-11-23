
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
        // When running in a Google Cloud environment, the SDK automatically
        // detects the service account and uses it to authenticate.
        // No need to specify credentials manually.
        storageBucket: process.env.GCLOUD_STORAGE_BUCKET || 'studio-161365104-8c7c1.appspot.com',
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    if (error.code === 'credential-default-not-found') {
        console.error('Could not find Application Default Credentials. ',
            'Ensure you are running in a GCP environment or have set up local credentials. ',
            'See https://cloud.google.com/docs/authentication/provide-credentials-adc for more details.');
    } else {
        console.error('Error initializing Firebase Admin SDK:', error);
    }
  }
}

export const firebaseAdmin = admin;
