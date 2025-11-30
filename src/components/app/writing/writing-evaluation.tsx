
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { aiPoweredWritingEvaluation } from '@/ai/flows/ai-powered-writing-evaluation';
import type { AiPoweredWritingEvaluationOutput, WritingQuestion, MockTest } from '@/lib/types';
import { WritingEvaluationResults } from './writing-evaluation-results';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Image from 'next/image';

const formSchema = z.object({
  task1Essay: z.string().min(150, { message: "Task 1 essay must be at least 150 words." }),
  task2Essay: z.string().min(250, { message: "Task 2 essay must be at least 250 words." }),
});

interface WritingEvaluationProps {
  test: MockTest;
}

function TaskCard({ task }: { task: WritingQuestion }) {
  // A simple check to see if the URL is valid before rendering.
  const isImageUrlValid = task.imageUrl && (task.imageUrl.startsWith('http://') || task.imageUrl.startsWith('https://'));

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit">{task.taskType}</Badge>
        <CardTitle className="pt-2">{task.topic}</CardTitle>
        <CardDescription>
          {`You should spend about ${task.taskType === 'Task 1' ? '20' : '40'} minutes on this task. Write at least ${task.wordCountTarget} words.`}
        </CardDescription>
      </CardHeader>
      {task.taskType === 'Task 1' && isImageUrlValid && (
         <CardContent>
             <div className="relative aspect-video w-full">
                <Image
                    src={task.imageUrl}
                    alt="Task 1 Chart or Diagram"
                    fill
                    className="rounded-md object-contain border p-2"
                />
             </div>
        </CardContent>
      )}
    </Card>
  )
}


export function WritingEvaluation({ test }: WritingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{task1: AiPoweredWritingEvaluationOutput | null, task2: AiPoweredWritingEvaluationOutput | null}>({task1: null, task2: null});
  const [error, setError] = useState<string | null>(null);

  const { user: authUser, firestore } = useFirebase();
  const { user: userProfile } = useUserProfile();
  const { toast } = useToast();
  
  const task1 = test.questions.find(q => q.taskType === 'Task 1');
  const task2 = test.questions.find(q => q.taskType === 'Task 2');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task1Essay: "",
      task2Essay: ""
    },
    mode: "onChange"
  });

  const { watch, formState: { isValid } } = form;
  const task1EssayValue = watch('task1Essay');
  const task2EssayValue = watch('task2Essay');

  const task1WordCount = useMemo(() => (task1EssayValue.trim().match(/\s+/g) || []).length + (task1EssayValue.trim() ? 1 : 0), [task1EssayValue]);
  const task2WordCount = useMemo(() => (task2EssayValue.trim().match(/\s+/g) || []).length + (task2EssayValue.trim() ? 1 : 0), [task2EssayValue]);

  const isButtonDisabled = isLoading || !isValid;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResults({task1: null, task2: null});

    if (!authUser || !firestore || !userProfile || !task1 || !task2) {
      setError("An error occurred. Please make sure you are logged in and the test is valid.");
      setIsLoading(false);
      return;
    }

    try {
      // Evaluate both tasks in parallel
      const [task1Result, task2Result] = await Promise.all([
        aiPoweredWritingEvaluation({ task: task1.topic, studentEssay: values.task1Essay }),
        aiPoweredWritingEvaluation({ task: task2.topic, studentEssay: values.task2Essay })
      ]);
      
      setResults({task1: task1Result, task2: task2Result});

      // Calculate combined score
      // Task 2 is weighted twice as much as Task 1
      const finalScore = (task1Result.overallBand + (task2Result.overallBand * 2)) / 3;
      
      const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
        setDocumentNonBlocking(submissionRef, {
            skill: 'Writing',
            testId: test.id,
            inputData: { task1: values.task1Essay, task2: values.task2Essay },
            aiReport: { task1: task1Result, task2: task2Result },
            scoreBand: finalScore,
            timestamp: serverTimestamp(),
        });
        
        const newTotalSubmissions = (userProfile.totalPracticeTime / 40 || 0) + 1; // Avg 40 mins
        const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

        const userRef = doc(firestore, 'users', authUser.uid);
        updateDocumentNonBlocking(userRef, {
            currentBand: newAverageBand,
            totalPracticeTime: increment(40) // Rough average time
        });

      toast({
        title: "Evaluation Complete!",
        description: `Your overall writing score of ${finalScore.toFixed(1)} has been saved.`,
      });

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message?.includes('503') || e.message?.includes('overloaded')
        ? "The AI service is currently overloaded. Please wait a moment and try submitting again."
        : "An error occurred during evaluation. Please try again.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Evaluation Failed",
        description: "Could not get feedback from the AI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!task1 || !task2) {
    return <p>This test is not configured correctly. It must have both Task 1 and Task 2.</p>;
  }

  return (
    <div className="space-y-6">
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           <Tabs defaultValue="task1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="task1">Task 1</TabsTrigger>
              <TabsTrigger value="task2">Task 2</TabsTrigger>
            </TabsList>
            <TabsContent value="task1" className="space-y-4">
              <TaskCard task={task1} />
               <FormField
                control={form.control}
                name="task1Essay"
                render={({ field }) => (
                  <FormItem>
                    <Textarea
                      placeholder="Start writing your Task 1 response here..."
                      className="min-h-[300px] text-base"
                      {...field}
                    />
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <FormMessage />
                        <span className={task1WordCount >= task1.wordCountTarget ? 'text-green-600' : 'text-destructive'}>
                            {task1WordCount} words
                        </span>
                    </div>
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="task2" className="space-y-4">
              <TaskCard task={task2} />
               <FormField
                control={form.control}
                name="task2Essay"
                render={({ field }) => (
                  <FormItem>
                    <Textarea
                      placeholder="Start writing your Task 2 essay here..."
                      className="min-h-[400px] text-base"
                      {...field}
                    />
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <FormMessage />
                        <span className={task2WordCount >= task2.wordCountTarget ? 'text-green-600' : 'text-destructive'}>
                            {task2WordCount} words
                        </span>
                    </div>
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

           {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex items-center gap-4 sticky bottom-4">
             <Button type="submit" disabled={isButtonDisabled} size="lg">
                {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Evaluating Both Tasks...
                </>
                ) : (
                    <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Submit for AI Evaluation
                    </>
                )}
            </Button>
            {!isValid && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <p>Please complete both essays to meet the word count requirements.</p>
                </div>
            )}
          </div>

        </form>
      </Form>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">Our AI is analyzing your essays...</p>
            <p className="text-sm text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}

      {results.task1 && results.task2 && (
          <div className="mt-8 space-y-6">
              <div className="p-4 rounded-lg bg-primary/10 border-l-4 border-primary">
                <h2 className="text-xl font-bold text-primary">Overall Test Result</h2>
                <p className="text-2xl font-bold">Your estimated overall writing band is: {((results.task1.overallBand + results.task2.overallBand * 2) / 3).toFixed(1)}</p>
                <p className="text-sm text-muted-foreground mt-1">Task 2 is weighted more heavily in the official IELTS test.</p>
              </div>
             <WritingEvaluationResults result={results.task1} title="Task 1 Analysis" />
             <WritingEvaluationResults result={results.task2} title="Task 2 Analysis" />
          </div>
      )}
    </div>
  );
}

    