
'use server';
import { config } from 'dotenv';
config();

// Dynamically import flows.
// This is the entry point for the Genkit dev server.
import('@/ai/flows/speaking-evaluation-flow.ts');
import('@/ai/flows/personalized-learning-path.ts');
import('@/ai/flows/multilingual-support.ts');
import('@ai/flows/ai-powered-writing-evaluation.ts');
import('@/ai/flows/predict-target-date.ts');
import('@/ai/flows/generate-test-correction-explanation.ts');
import('@/ai/flows/content-factory-flow.ts');
import('@/ai/flows/text-to-speech-flow.ts');
import('@/ai/flows/process-pdf-flow.ts');
import('@/ai/flows/generate-lesson-image-flow.ts');
import('@/ai/flows/generate-writing-task-image-flow.ts');

    