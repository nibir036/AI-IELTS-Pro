
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization errors.
if (!admin.apps.length) {
  try {
    // When running in a Google Cloud environment (like Firebase Studio),
    // calling initializeApp() without arguments allows the SDK to automatically
    // detect the service account and project configuration, including the
    // correct default storage bucket.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized automatically.');
  } catch (error: any) {
    // This catch block handles cases where automatic initialization might fail,
    // for example, in a local development environment without proper credentials.
    if (error.code === 'credential-default-not-found') {
      console.error(
        'Could not find Application Default Credentials. ',
        'Ensure you are running in a GCP environment or have set up local credentials. ',
        'See https://cloud.google.com/docs/authentication/provide-credentials-adc for more details.'
      );
    } else {
      console.error('Error initializing Firebase Admin SDK:', error);
    }
  }
}

export const firebaseAdmin = admin;
