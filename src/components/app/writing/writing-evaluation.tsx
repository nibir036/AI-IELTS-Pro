'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { aiPoweredWritingEvaluation } from '@/ai/flows/ai-powered-writing-evaluation';
import type { AiPoweredWritingEvaluationOutput, WritingQuestion } from '@/lib/types';
import { WritingEvaluationResults } from './writing-evaluation-results';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  essay: z.string().min(100, {
    message: "Essay must be at least 100 characters.",
  }),
});

interface WritingEvaluationProps {
  task: WritingQuestion;
  onEvaluationComplete?: (result: AiPoweredWritingEvaluationOutput) => void;
  isDiagnosticTest?: boolean;
}

export function WritingEvaluation({ task, onEvaluationComplete, isDiagnosticTest = false }: WritingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiPoweredWritingEvaluationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user, firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      essay: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiPoweredWritingEvaluation({
        task: task.topic,
        studentEssay: values.essay,
      });

      if (onEvaluationComplete) {
        onEvaluationComplete(response);
      } else {
        setResult(response);
         if (user && firestore) {
            // Save submission to Firestore
            const submissionRef = collection(firestore, 'users', user.uid, 'submissions');
            await addDoc(submissionRef, {
                skill: 'Writing',
                testId: task.taskType,
                inputData: values.essay,
                aiReport: response,
                scoreBand: response.overallBand,
                timestamp: serverTimestamp(),
            });

             // Update user's current band score
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                currentBand: response.overallBand,
            });

            toast({
                title: "Evaluation Complete!",
                description: `Your writing score of ${response.overallBand.toFixed(1)} has been saved.`,
            });
        }
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('503') || e.message?.includes('overloaded')) {
        setError("The AI service is currently overloaded. Please wait a moment and try submitting again.");
      } else {
        setError("An error occurred during evaluation. Please try again.");
      }
       toast({
        variant: "destructive",
        title: "Evaluation Failed",
        description: "Could not get feedback from the AI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">{isDiagnosticTest ? 'Diagnostic Test' : task.taskType}</Badge>
          <CardTitle className="pt-2">{task.topic}</CardTitle>
          <CardDescription>
            {isDiagnosticTest
                ? "Write at least 150 words. This will be used to determine your starting band score."
                : `You should spend about 40 minutes on this task. Write at least ${task.wordCountTarget} words.`
            }
            </CardDescription>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="essay"
            render={({ field }) => (
              <FormItem>
                <Textarea
                  placeholder="Start writing your essay here..."
                  className="min-h-[400px] text-base"
                  {...field}
                />
                <FormMessage />
              </FormItem>
            )}
          />
           {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isDiagnosticTest ? 'Analyzing...' : 'Evaluating...'}
              </>
            ) : (
                <>
                <Sparkles className="mr-2 h-4 w-4" />
                {isDiagnosticTest ? 'Submit and Get My Score' : 'Submit for AI Evaluation'}
                </>
            )}
          </Button>
        </form>
      </Form>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">Our AI is analyzing your essay...</p>
            <p className="text-sm text-muted-foreground">Success is built on practice like this. Please wait.</p>
        </div>
      )}

      {result && !onEvaluationComplete && <div className="mt-8"><WritingEvaluationResults result={result} /></div>}
    </div>
  );
}