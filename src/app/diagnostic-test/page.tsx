'use client';

import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { AuthGuard } from "@/components/app/auth-guard";
import { useFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { AiPoweredWritingEvaluationOutput } from "@/lib/types";

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
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                currentBand: result.overallBand,
            });

            toast({
                title: "Diagnostic Complete!",
                description: `Your estimated band score is ${result.overallBand.toFixed(1)}. Your learning path is ready!`,
            });
            
            // Redirect to dashboard where the new path will be generated
            router.push('/dashboard');

        } catch (error) {
            console.error("Error updating user profile with band score:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not save your band score. Please try again.",
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
