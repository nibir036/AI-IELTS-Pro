'use client';

import { useState, useEffect } from 'react';
import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { AuthGuard } from "@/components/app/auth-guard";
import { useFirebase } from "@/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { AiPoweredWritingEvaluationOutput, WritingQuestion } from "@/lib/types";
import { generatePersonalizedLearningPath } from "@/ai/flows/personalized-learning-path";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Skeleton } from '@/components/ui/skeleton';

const diagnosticTasks: WritingQuestion[] = [
    {
        task: 2,
        topic: 'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
        taskType: 'Task 2',
        wordCountTarget: 150,
    },
    {
        task: 2,
        topic: 'In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this.',
        taskType: 'Task 2',
        wordCountTarget: 150,
    },
    {
        task: 2,
        topic: 'Success is often measured by wealth and material possessions. To what extent do you agree or disagree with this statement?',
        taskType: 'Task 2',
        wordCountTarget: 150,
    },
    {
        task: 2,
        topic: 'Some people believe that technology has made our lives more complex and stressful, while others think it has simplified our lives. Discuss both views and give your own opinion.',
        taskType: 'Task 2',
        wordCountTarget: 150,
    },
];

function DiagnosticTestSkeleton() {
    return (
        <div className="container mx-auto max-w-4xl py-8">
            <div className="space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-10 w-48" />
            </div>
        </div>
    );
}

export default function DiagnosticTestPage() {
    const { user: authUser, firestore } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const [selectedTask, setSelectedTask] = useState<WritingQuestion | null>(null);

    useEffect(() => {
        // Select a random task only on the client-side to avoid hydration errors
        const randomIndex = Math.floor(Math.random() * diagnosticTasks.length);
        setSelectedTask(diagnosticTasks[randomIndex]);
    }, []);

    const handleEvaluationComplete = async (result: AiPoweredWritingEvaluationOutput) => {
        if (!authUser || !firestore || !userProfile) {
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
            const userRef = doc(firestore, 'users', authUser.uid);
            await updateDoc(userRef, {
                currentBand: result.overallBand,
            });

            // 2. Save the submission
            const submissionRef = collection(firestore, 'users', authUser.uid, 'submissions');
             await addDoc(submissionRef, {
                skill: 'Writing',
                testId: 'Diagnostic Test',
                inputData: "Diagnostic essay submission",
                aiReport: result,
                scoreBand: result.overallBand,
                timestamp: serverTimestamp(),
            });

            // 3. Generate the personalized learning path
            const learningPathResult = await generatePersonalizedLearningPath({
                currentBand: result.overallBand,
                targetBand: userProfile.targetBand, 
                nativeLanguage: userProfile.nativeLanguage,
            });

            // 4. Save the learning path to Firestore
            const learningPathsRef = collection(firestore, 'users', authUser.uid, 'learningPaths');
            const newLearningPathDoc = await addDoc(learningPathsRef, {
                lessonIds: learningPathResult.lessonIds,
                createdAt: serverTimestamp(),
            });

            // 5. Update user profile with the new learning path ID
            await updateDoc(userRef, {
                learningPathId: newLearningPathDoc.id,
            });

            toast({
                title: "Diagnostic Complete!",
                description: `Your estimated band score is ${result.overallBand.toFixed(1)}. Your learning path is ready!`,
            });
            
            // 6. Redirect to dashboard
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

    if (!selectedTask) {
        return <DiagnosticTestSkeleton />;
    }

    return (
        <AuthGuard>
            <div className="container mx-auto max-w-4xl py-8">
                <WritingEvaluation 
                    task={selectedTask}
                    onEvaluationComplete={handleEvaluationComplete}
                    isDiagnosticTest={true}
                    testId="DIAGNOSTIC_001"
                />
            </div>
        </AuthGuard>
    );
}
