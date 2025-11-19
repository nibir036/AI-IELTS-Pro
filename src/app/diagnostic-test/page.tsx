'use client';

import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { AuthGuard } from "@/components/app/auth-guard";
import { useFirebase } from "@/firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { AiPoweredWritingEvaluationOutput } from "@/lib/types";
import { generatePersonalizedLearningPath } from "@/ai/flows/personalized-learning-path";

const diagnosticTask = {
  task: 2,
  topic: 'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
  taskType: 'Task 2' as 'Task 2',
  wordCountTarget: 250,
};

export default function DiagnosticTestPage() {
    const { user, firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const handleEvaluationComplete = async (result: AiPoweredWritingEvaluationOutput) => {
        if (!user || !firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save your results. Please log in again.",
            });
            router.push('/login');
            return;
        }

        try {
            // 1. Update user's current band score
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                currentBand: result.overallBand,
            });

            // 2. Generate the personalized learning path
            const learningPathResult = await generatePersonalizedLearningPath({
                currentBand: result.overallBand,
                targetBand: 7.5, // Assuming a default target band for now
                nativeLanguage: 'English' // Assuming a default native language
            });

            // 3. Save the learning path to Firestore
            const learningPathsRef = collection(firestore, 'users', user.uid, 'learningPaths');
            const newLearningPathDoc = await addDoc(learningPathsRef, {
                lessonIds: learningPathResult.lessonIds,
                createdAt: new Date(),
            });

            // 4. Update user profile with the new learning path ID
            await updateDoc(userRef, {
                learningPathId: newLearningPathDoc.id,
            });

            toast({
                title: "Diagnostic Complete!",
                description: `Your estimated band score is ${result.overallBand.toFixed(1)}. Your learning path is ready!`,
            });
            
            // 5. Redirect to dashboard
            router.push('/dashboard');

        } catch (error) {
            console.error("Error in diagnostic test completion process:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "An error occurred while creating your learning path. Please try again.",
            });
        }
    };

    return (
        <AuthGuard>
            <div className="container mx-auto max-w-4xl py-8">
                <WritingEvaluation 
                    task={diagnosticTask} 
                    onEvaluationComplete={handleEvaluationComplete}
                    isDiagnosticTest={true}
                />
            </div>
        </AuthGuard>
    );
}
