
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

const formSchema = z.object({
  task1Essay: z.string().optional(),
  task2Essay: z.string().optional(),
}).refine(data => data.task1Essay || data.task2Essay, {
    message: "At least one essay is required.",
    path: ["task1Essay"], // Assign error to one field for display
});


interface WritingEvaluationProps {
  test: MockTest;
  onEvaluationComplete?: (results: {task1: AiPoweredWritingEvaluationOutput | null, task2: AiPoweredWritingEvaluationOutput | null}) => void;
  isDiagnosticTest?: boolean;
}

function TaskCard({ task }: { task: WritingQuestion }) {
  const isImageUrlValid = task.imageUrl && (task.imageUrl.startsWith('https'));

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit">{task.taskType}</Badge>
        <CardTitle className="pt-2">{task.topic}</CardTitle>
        <CardDescription>
          {`You should spend about ${task.taskType === 'Task 1' ? '20' : '40'} minutes on this task. Write at least ${task.wordCountTarget} words.`}
        </CardDescription>
      </CardHeader>
      {task.taskType === 'Task 1' && task.imageUrl && (
         <CardContent>
             {isImageUrlValid ? (
                <div className="w-full mt-4">
                    <Image
                        src={task.imageUrl}
                        alt="Task 1 Chart or Diagram"
                        width={800}
                        height={600}
                        className="rounded-md object-contain border p-2 w-full h-auto"
                    />
                </div>
             ) : (
                <div className="aspect-video w-full flex items-center justify-center bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">No image provided for this task.</p>
                </div>
             )}
        </CardContent>
      )}
    </Card>
  )
}


export function WritingEvaluation({ test, onEvaluationComplete, isDiagnosticTest = false }: WritingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{task1: AiPoweredWritingEvaluationOutput | null, task2: AiPoweredWritingEvaluationOutput | null}>({task1: null, task2: null});
  const [error, setError] = useState<string | null>(null);
  
  const task1 = test.questions.find(q => q.taskType === 'Task 1');
  const task2 = test.questions.find(q => q.taskType === 'Task 2');

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task1Essay: "",
      task2Essay: ""
    },
    mode: "onChange"
  });

  const { watch, formState } = form;
  const task1EssayValue = watch('task1Essay') || '';
  const task2EssayValue = watch('task2Essay') || '';

  const task1WordCount = useMemo(() => (task1EssayValue.trim().match(/\S+/g) || []).length, [task1EssayValue]);
  const task2WordCount = useMemo(() => (task2EssayValue.trim().match(/\S+/g) || []).length, [task2EssayValue]);
  
  const isTask1Valid = task1 ? task1WordCount >= task1.wordCountTarget : true;
  const isTask2Valid = task2 ? task2WordCount >= task2.wordCountTarget : true;

  const isButtonDisabled = isLoading || (task1 && !isTask1Valid) || (task2 && !isTask2Valid) || (!task1 && !task2);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResults({task1: null, task2: null});

    const evaluationPromises = [];
    if (task1 && values.task1Essay) {
        evaluationPromises.push(aiPoweredWritingEvaluation({ task: task1.topic, studentEssay: values.task1Essay }));
    } else {
        evaluationPromises.push(Promise.resolve(null)); // Push null if no task1
    }
    if (task2 && values.task2Essay) {
        evaluationPromises.push(aiPoweredWritingEvaluation({ task: task2.topic, studentEssay: values.task2Essay }));
    } else {
        evaluationPromises.push(Promise.resolve(null)); // Push null if no task2
    }


    try {
      const [task1Result, task2Result] = await Promise.all(evaluationPromises);
      
      setResults({task1: task1Result, task2: task2Result});
      
      if (onEvaluationComplete) {
        onEvaluationComplete({task1: task1Result, task2: task2Result});
      }

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message?.includes('503') || e.message?.includes('overloaded')
        ? "The AI service is currently overloaded. Please wait a moment and try submitting again."
        : "An error occurred during evaluation. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }
  
  const hasMultipleTasks = task1 && task2;

  if (results.task1 || results.task2) {
      const finalScore = results.task1 && results.task2 
          ? ((results.task1.overallBand + results.task2.overallBand * 2) / 3)
          : (results.task1?.overallBand || results.task2?.overallBand || 0);

      return (
          <div className="mt-8 space-y-6">
              {results.task1 && results.task2 && (
                   <Card className="bg-primary/10 border-primary/30">
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">Overall Test Result</CardTitle>
                            <CardDescription>Your estimated overall writing band is: <span className="text-2xl font-bold text-primary">{finalScore.toFixed(1)}</span></CardDescription>
                            <p className="text-xs text-muted-foreground pt-2">Task 2 is weighted more heavily in the official IELTS test, which is reflected in this combined score.</p>
                        </CardHeader>
                    </Card>
              )}
             {results.task1 && <WritingEvaluationResults result={results.task1} title="Task 1 Analysis" />}
             {results.task2 && <WritingEvaluationResults result={results.task2} title={isDiagnosticTest ? "Diagnostic Test Analysis" : "Task 2 Analysis"}/>}
          </div>
      );
  }

  return (
    <div className="space-y-6">
       {isDiagnosticTest && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-300 flex items-center gap-2"><FileText /> Diagnostic Test</CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-400">
                        Welcome! Please complete this short essay. Your response will be analyzed by our AI to determine your current writing level and generate a personalized study plan to help you reach your goals.
                    </CardDescription>
                </CardHeader>
            </Card>
       )}
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            {hasMultipleTasks ? (
                 <Card>
                    <CardContent className="p-0">
                        <Tabs defaultValue="task1">
                            <TabsList className="grid w-full grid-cols-2 rounded-b-none rounded-t-lg">
                                <TabsTrigger value="task1">Task 1</TabsTrigger>
                                <TabsTrigger value="task2">Task 2</TabsTrigger>
                            </TabsList>
                             <div className="p-6 space-y-4">
                                <TabsContent value="task1" className="space-y-4 m-0">
                                    {task1 && <TaskCard task={task1} />}
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
                                                {task1 && <span className={task1WordCount >= task1.wordCountTarget ? 'text-green-600' : ''}>{task1WordCount} / {task1.wordCountTarget} words</span>}
                                            </div>
                                        </FormItem>
                                        )}
                                    />
                                </TabsContent>
                                <TabsContent value="task2" className="space-y-4 m-0">
                                    {task2 && <TaskCard task={task2} />}
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
                                                 {task2 && <span className={task2WordCount >= task2.wordCountTarget ? 'text-green-600' : ''}>{task2WordCount} / {task2.wordCountTarget} words</span>}
                                            </div>
                                        </FormItem>
                                        )}
                                    />
                                </TabsContent>
                             </div>
                        </Tabs>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-6 space-y-4">
                        {task2 && <TaskCard task={task2} />}
                        <FormField
                            control={form.control}
                            name="task2Essay"
                            render={({ field }) => (
                            <FormItem>
                                <Textarea
                                placeholder="Start writing your essay here..."
                                className="min-h-[400px] text-base"
                                {...field}
                                />
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <FormMessage />
                                    {task2 && <span className={task2WordCount >= task2.wordCountTarget ? 'text-green-600' : ''}>{task2WordCount} / {task2.wordCountTarget} words</span>}
                                </div>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            )}

            <div className="mt-6 flex flex-col items-start gap-4">
                 {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                 {(!formState.isValid && !isLoading) && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <p>Please complete the essay(s) to meet the minimum word count requirements.</p>
                    </div>
                )}
                <Button type="submit" disabled={isButtonDisabled} size="lg">
                    {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Evaluating...
                    </>
                    ) : (
                        <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Submit for AI Evaluation
                        </>
                    )}
                </Button>
            </div>
        </form>
      </Form>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">Our AI is analyzing your essay(s)...</p>
            <p className="text-sm text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}
    </div>
  );
}
