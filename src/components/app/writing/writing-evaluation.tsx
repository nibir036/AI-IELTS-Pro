'use client';

import { useState, useMemo } from 'react';
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
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLabel } from '@/components/ui/chart';


const formSchema = (isDiagnostic: boolean) => z.object({
  essay: z.string().min(isDiagnostic ? 100 : 150, {
    message: `Essay must be at least ${isDiagnostic ? 100 : 150} words.`,
  }),
});


interface WritingEvaluationProps {
  task: WritingQuestion;
  testId?: string;
  onEvaluationComplete?: (result: AiPoweredWritingEvaluationOutput) => void;
  isDiagnosticTest?: boolean;
}

const chartData = [
  { year: "1990", coal: 35, oil: 33, gas: 18, nuclear: 6, renewables: 8 },
  { year: "2020", coal: 27, oil: 31, gas: 25, nuclear: 4, renewables: 13 },
];

const chartConfig = {
    coal: { label: "Coal", color: "hsl(var(--chart-1))" },
    oil: { label: "Oil", color: "hsl(var(--chart-2))" },
    gas: { label: "Natural Gas", color: "hsl(var(--chart-3))" },
    nuclear: { label: "Nuclear", color: "hsl(var(--chart-4))" },
    renewables: { label: "Renewables", color: "hsl(var(--chart-5))" },
};


function EnergyChart() {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Global Energy Sources, 1990 vs 2020</CardTitle>
                <CardDescription>Percentage of total energy consumption</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => value}
                        />
                         <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Legend align="center" iconType="circle" />
                        <Bar dataKey="coal" fill="var(--color-coal)" radius={4} />
                        <Bar dataKey="oil" fill="var(--color-oil)" radius={4} />
                        <Bar dataKey="gas" fill="var(--color-gas)" radius={4} />
                        <Bar dataKey="nuclear" fill="var(--color-nuclear)" radius={4} />
                        <Bar dataKey="renewables" fill="var(--color-renewables)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}


export function WritingEvaluation({ task, testId, onEvaluationComplete, isDiagnosticTest = false }: WritingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiPoweredWritingEvaluationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user: authUser, firestore } = useFirebase();
  const { user: userProfile } = useUserProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<ReturnType<typeof formSchema>>>({
    resolver: zodResolver(formSchema(isDiagnosticTest)),
    defaultValues: {
      essay: "",
    },
    mode: "onChange"
  });

  const essayValue = form.watch('essay');
  const wordCount = useMemo(() => {
    const words = essayValue.trim().match(/\s+/g);
    return words ? words.length + 1 : (essayValue.trim() ? 1 : 0);
  }, [essayValue]);

  const isButtonDisabled = isLoading || (wordCount < (isDiagnosticTest ? 100 : 150));


  async function onSubmit(values: z.infer<ReturnType<typeof formSchema>>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    if (!authUser || !firestore || !userProfile) {
      setError("You must be logged in to submit an evaluation.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await aiPoweredWritingEvaluation({
        task: task.topic,
        studentEssay: values.essay,
      });

      if (onEvaluationComplete) {
        onEvaluationComplete(response);
      } else {
        setResult(response);
        
        const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
        setDocumentNonBlocking(submissionRef, {
            skill: 'Writing',
            testId: testId,
            inputData: values.essay,
            aiReport: response,
            scoreBand: response.overallBand,
            timestamp: serverTimestamp(),
        });
        
        const newTotalSubmissions = (userProfile.totalPracticeTime / 20 || 0) + 1;
        const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + response.overallBand) / newTotalSubmissions;

        const userRef = doc(firestore, 'users', authUser.uid);
        updateDocumentNonBlocking(userRef, {
            currentBand: newAverageBand,
            totalPracticeTime: increment(20) // Assume 20 mins for a writing task
        });

        toast({
            title: "Evaluation Complete!",
            description: `Your writing score of ${response.overallBand.toFixed(1)} has been saved.`,
        });
      }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">{isDiagnosticTest ? 'Diagnostic Test' : task.taskType}</Badge>
          <CardTitle className="pt-2">{task.topic}</CardTitle>
          <CardDescription>
            {isDiagnosticTest
                ? "Write at least 150 words. This will be used to determine your starting band score."
                : `You should spend about ${task.taskType === 'Task 1' ? '20' : '40'} minutes on this task. Write at least ${task.wordCountTarget} words.`
            }
            </CardDescription>
        </CardHeader>
      </Card>

      {task.taskType === 'Task 1' && <EnergyChart />}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="essay"
            render={({ field }) => (
              <FormItem>
                <Textarea
                  placeholder="Start writing your essay here..."
                  className="min-h-[300px] md:min-h-[400px] text-base"
                  {...field}
                />
                 <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <FormMessage />
                    <span className={wordCount >= (isDiagnosticTest ? 100 : 150) ? 'text-green-600' : 'text-destructive'}>
                        {wordCount} words
                    </span>
                 </div>
              </FormItem>
            )}
          />
           {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isButtonDisabled} className="w-full sm:w-auto">
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
            {wordCount < (isDiagnosticTest ? 100 : 150) && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <p>
                        {isDiagnosticTest 
                            ? `Please write at least 100 words.`
                            : `Please write at least ${task.wordCountTarget} words.`
                        }
                    </p>
                </div>
            )}
          </div>
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
