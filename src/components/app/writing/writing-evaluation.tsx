'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { aiPoweredWritingEvaluation } from '@/ai/flows/ai-powered-writing-evaluation';
import type { AiPoweredWritingEvaluationOutput, WritingQuestion } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
      }
    } catch (e) {
      setError("An error occurred during evaluation. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }
  
  const renderResults = () => {
    if(!result) return null;
    return (
        <Card className="mt-8 animate-in fade-in-50 duration-500">
            <CardHeader>
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2"><Sparkles className="text-accent" /> AI Evaluation Result</CardTitle>
                        <CardDescription>Here's your detailed feedback.</CardDescription>
                    </div>
                    <div className="text-center w-full sm:w-auto rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Overall Band</p>
                        <p className="text-4xl font-bold text-primary">{result.overallBand.toFixed(1)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Feedback Summary</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{result.feedbackSummary}</p>
                </div>
                <Separator />
                <div>
                    <h3 className="font-semibold mb-2">Criterion Scores</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(result.criterionScores).map(([key, score]) => (
                            <Card key={key}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{score.band.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{score.comment}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <Separator />
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="font-semibold">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary"/> Areas for Improvement
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {result.improvementAreas.map((area, index) => (
                                <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                                    <p className="font-medium flex items-center gap-2">
                                        <Badge variant="secondary">{area.type}</Badge> {area.rule}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">{area.example}</p>
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger className="font-semibold">
                             <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600"/> Corrected Essay
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none pt-4 text-muted-foreground whitespace-pre-wrap">
                            {result.correctedEssay}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
  };


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
      
      {error && <p className="text-destructive text-sm">{error}</p>}

      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">Our AI is analyzing your essay...</p>
            <p className="text-sm text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}

      {result && !onEvaluationComplete && renderResults()}
    </div>
  );
}
