
'use client';

import { useState, useEffect } from 'react';
import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { AuthGuard } from "@/components/app/auth-guard";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { AiPoweredWritingEvaluationOutput, MockTest } from "@/lib/types";
import { generatePersonalizedLearningPath } from "@/ai/flows/personalized-learning-path";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Skeleton } from '@/components/ui/skeleton';

const DIAGNOSTIC_TEST_ID = "IELTS_Writing_001";

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
    const { authUser, firestore } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();

    const diagnosticTestDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'mockTests', DIAGNOSTIC_TEST_ID);
    }, [firestore]);

    const { data: diagnosticTest, isLoading: isTestLoading } = useDoc<MockTest>(diagnosticTestDocRef);

    const handleEvaluationComplete = async (results: { task1: AiPoweredWritingEvaluationOutput | null; task2: AiPoweredWritingEvaluationOutput | null }) => {
        if (!authUser || !firestore || !userProfile || !results.task1 || !results.task2) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save your results. Please log in again.",
            });
            router.push('/login');
            return;
        }

        const finalScore = (results.task1.overallBand + (results.task2.overallBand * 2)) / 3;

        try {
            // 1. Update user's current band score
            const userRef = doc(firestore, 'users', authUser.uid);
            await updateDoc(userRef, {
                currentBand: finalScore,
            });

            // 2. Save the submission
            const submissionRef = collection(firestore, 'users', authUser.uid, 'submissions');
             await addDoc(submissionRef, {
                skill: 'Writing',
                testId: DIAGNOSTIC_TEST_ID,
                inputData: "Diagnostic essay submission", // Placeholder as full text is in aiReport
                aiReport: results,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            // 3. Generate the personalized learning path
            const learningPathResult = await generatePersonalizedLearningPath({
                currentBand: finalScore,
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
                description: `Your estimated band score is ${finalScore.toFixed(1)}. Your learning path is ready!`,
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

    if (isTestLoading || !diagnosticTest) {
        return <DiagnosticTestSkeleton />;
    }

    return (
        <AuthGuard>
            <div className="container mx-auto max-w-4xl py-8">
                <WritingEvaluation 
                    test={diagnosticTest}
                    onEvaluationComplete={handleEvaluationComplete}
                    isDiagnosticTest={true}
                />
            </div>
        </AuthGuard>
    );
}
