
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Important: Firebase Storage CORS Configuration

For file uploads (e.g., in the Speaking Practice section) to work correctly from the browser, you **MUST** configure Cross-Origin Resource Sharing (CORS) on your Firebase Storage bucket.

If you skip this step, uploads will hang indefinitely with a CORS error in the browser console.

### How to Configure CORS

1.  A `cors.json` file is included in the root of this project with a permissive development configuration.
2.  You must apply this configuration to your bucket using an **authenticated terminal**, such as the Google Cloud Shell.
3.  Open Cloud Shell from the Google Cloud Console, ensure you are in the correct project (`studio-161365104-8c7c1`), and run the command: `gsutil cors set cors.json gs://YOUR_BUCKET_NAME`. Replace `YOUR_BUCKET_NAME` with your actual bucket name (e.g., `studio-161365104-8c7c1.firebasestorage.app`).

It may take a minute for the settings to apply. After running the command, your file uploads should work correctly.

**For production**, you should replace `"origin": ["*"]` in `cors.json` with the specific domains of your deployed application for better security.
