
'use server';
import { config } from 'dotenv';
config();

import { getFirebaseAdmin } from '@/firebase/admin';

// Asynchronous self-invoking function to initialize Firebase Admin first.
(async () => {
    try {
        await getFirebaseAdmin();
        console.log("Firebase Admin initialized for Genkit dev server.");
        
        // Dynamically import flows only after Firebase Admin is ready.
        import('@/ai/flows/speaking-evaluation-flow.ts');
        import('@/ai/flows/personalized-learning-path.ts');
        import('@/ai/flows/multilingual-support.ts');
        import('@/ai/flows/ai-powered-writing-evaluation.ts');
        import('@/ai/flows/predict-target-date.ts');
        import('@/ai/flows/generate-test-correction-explanation.ts');
        import('@/ai/flows/content-factory-flow.ts');
        import('@/ai/flows/text-to-speech-flow.ts');
        import('@/ai/flows/process-pdf-flow.ts');
        import('@/ai/flows/generate-lesson-image-flow.ts');
        import('@/ai/flows/process-image-flow.ts');
    } catch (e) {
        console.error("Failed to initialize Firebase Admin for Genkit dev server:", e);
        process.exit(1);
    }
})();
