
import * as admin from 'firebase-admin';

// The default bucket name for your Firebase project.
// It's crucial to use the 'gs://' format for the Admin SDK.
const BUCKET_NAME = 'gs://studio-161365104-8c7c1.appspot.com';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
        // When running in a Google Cloud environment, the SDK automatically
        // detects the service account and uses it to authenticate.
        // The storageBucket property is explicitly set for clarity and robustness.
        storageBucket: BUCKET_NAME,
    });
    console.log('Firebase Admin SDK initialized successfully for bucket:', BUCKET_NAME);
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
