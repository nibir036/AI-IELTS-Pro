'use client';

import type { AiPoweredSpeakingEvaluationOutput } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface SpeakingEvaluationResultsProps {
  result: AiPoweredSpeakingEvaluationOutput;
}

export function SpeakingEvaluationResults({ result }: SpeakingEvaluationResultsProps) {
  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="text-accent" /> Here's Your Analysis!
            </CardTitle>
            <CardDescription>Detailed feedback for your speaking performance. Every practice is a step forward.</CardDescription>
          </div>
          <div className="text-center w-full sm:w-auto rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Estimated Band</p>
            <p className="text-4xl font-bold text-primary">{result.scoreBand.toFixed(1)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Overall Feedback</h3>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{result.overallFeedback}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pronunciation</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{result.pronunciationFeedback}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Fluency</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{result.fluencyFeedback}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Coherence</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{result.coherenceFeedback}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Grammar</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{result.grammarFeedback}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Vocabulary</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{result.vocabularyFeedback}</p></CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}