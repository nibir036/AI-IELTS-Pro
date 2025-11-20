
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarCheck, Lightbulb } from 'lucide-react';
import { predictTargetDate } from '@/ai/flows/predict-target-date';
import type { User, Submission, PredictTargetDateOutput } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';

interface PredictedDateCardProps {
  user: User;
}

export function PredictedDateCard({ user }: PredictedDateCardProps) {
  const { firestore } = useFirebase();
  const [prediction, setPrediction] = useState<PredictTargetDateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.id, 'submissions'),
      orderBy('timestamp', 'desc'),
      limit(20) // Get a decent sample of recent submissions for analysis
    );
  }, [firestore, user]);

  const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionsQuery);

  useEffect(() => {
    async function fetchPrediction() {
      if (submissionsLoading || !submissions || !user || user.currentBand === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const submissionSummary = submissions.map(s => ({
          skill: s.skill,
          scoreBand: s.scoreBand,
          timestamp: (s.timestamp as any).toDate().toISOString(), // Convert Firestore Timestamp to ISO String
        }));

        const result = await predictTargetDate({
          currentBand: user.currentBand,
          targetBand: user.targetBand,
          submissions: submissionSummary,
        });
        setPrediction(result);
      } catch (error) {
        console.error("Error fetching prediction:", error);
        setPrediction(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrediction();
  }, [submissions, submissionsLoading, user]);

  if (user.currentBand === 0) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>Target Date Prediction</CardTitle>
            <CardDescription>Your estimated date to reach band {user.targetBand}.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
             <p className="text-sm text-muted-foreground h-24 flex items-center justify-center">
                Complete your diagnostic test to get a prediction.
            </p>
        </CardContent>
       </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Date Prediction</CardTitle>
        <CardDescription>Your estimated date to reach band {user.targetBand}.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Analyzing your progress...</p>
            </div>
        ) : prediction ? (
            <div>
                <div className="flex items-center justify-center gap-2">
                    <CalendarCheck className="h-8 w-8 text-primary"/>
                    <p className="text-3xl font-bold">
                        {format(new Date(prediction.predictedDate), "do MMMM yyyy")}
                    </p>
                </div>
                <div className="mt-4 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{prediction.reasoning}</span>
                </div>
            </div>
        ) : (
            <p className="text-sm text-muted-foreground h-24 flex items-center justify-center">
                Not enough data to predict. Keep practicing!
            </p>
        )}
      </CardContent>
    </Card>
  );
}
