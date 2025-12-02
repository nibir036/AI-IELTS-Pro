
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Important: Firebase Storage CORS Configuration

For file uploads (e.g., in the Speaking Practice section) to work correctly from the browser, you **MUST** configure Cross-Origin Resource Sharing (CORS) on your Firebase Storage bucket.

If you skip this step, uploads will hang indefinitely with a CORS error in the browser console.

### How to Configure CORS

1.  A `cors.json` file is included in the root of this project with a permissive development configuration.
2.  Open a terminal in your project's root directory.
3.  Run the following command, replacing `YOUR_BUCKET_NAME` with your actual Firebase Storage bucket name (e.g., `gs://my-project-12345.firebasestorage.app`):

```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

It may take a minute for the settings to apply. After running the command, your file uploads should work correctly.

**For production**, you should replace `"origin": ["*"]` in `cors.json` with the specific domains of your deployed application for better security.

