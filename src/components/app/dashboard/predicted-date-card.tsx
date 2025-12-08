
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

const PREDICTION_CACHE_KEY = 'predictionCache';
const SUBMISSION_COUNT_CACHE_KEY = 'submissionCountCache';

export function PredictedDateCard({ user }: PredictedDateCardProps) {
  const { firestore } = useFirebase();
  const [prediction, setPrediction] = useState<PredictTargetDateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'no-data' | 'initial'>('loading');

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
      // Don't run if the user has no initial score
      if (user.currentBand === 0) {
          setStatus('initial');
          setIsLoading(false);
          return;
      }
      
      // Wait for submissions to load before doing anything
      if (submissionsLoading) {
        setStatus('loading');
        setIsLoading(true);
        return;
      }
      
      // If submissions have loaded, but there are none, there's not enough data.
      if (!submissions || submissions.length === 0) {
        setStatus('no-data');
        setIsLoading(false);
        return;
      }

      // Check cache *after* we confirm we have submissions
      const cachedPrediction = sessionStorage.getItem(PREDICTION_CACHE_KEY);
      const cachedSubmissionCount = sessionStorage.getItem(SUBMISSION_COUNT_CACHE_KEY);

      if (cachedPrediction && cachedSubmissionCount && submissions.length === parseInt(cachedSubmissionCount, 10)) {
          setPrediction(JSON.parse(cachedPrediction));
          setStatus('success');
          setIsLoading(false);
          return; // Use cache and exit if submission count hasn't changed.
      }
      
      // If we are here, it means we need to fetch a new prediction.
      setIsLoading(true);
      setStatus('loading');
      try {
        const submissionSummary = submissions.map(s => ({
          skill: s.skill,
          scoreBand: s.scoreBand,
          // Ensure timestamp is a valid ISO string
          timestamp: s.timestamp ? new Date((s.timestamp as any).seconds * 1000).toISOString() : new Date().toISOString(),
        }));

        const result = await predictTargetDate({
          currentBand: user.currentBand,
          targetBand: user.targetBand,
          submissions: submissionSummary,
        });
        setPrediction(result);
        sessionStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(result)); // Cache the result
        sessionStorage.setItem(SUBMISSION_COUNT_CACHE_KEY, submissions.length.toString()); // Cache submission count
        setStatus('success');
      } catch (error) {
        console.error("Error fetching prediction:", error);
        setPrediction(null);
        setStatus('no-data'); // Fallback to 'no-data' on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrediction();
  }, [submissions, submissionsLoading, user.currentBand, user.targetBand]); // Removed `user` object to prevent re-runs on other user property changes

  const renderContent = () => {
    switch (status) {
        case 'loading':
            return (
                 <div className="flex flex-col items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Analyzing your progress...</p>
                </div>
            )
        case 'success':
            return prediction ? (
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
            ) : null;
        case 'initial':
             return (
                 <p className="text-sm text-muted-foreground h-24 flex items-center justify-center text-center">
                    Complete your diagnostic test to get a prediction.
                </p>
             );
        case 'no-data':
        default:
            return (
                <p className="text-sm text-muted-foreground h-24 flex items-center justify-center text-center">
                    Not enough data to predict. Keep practicing!
                </p>
            );
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Date Prediction</CardTitle>
        <CardDescription>Your estimated date to reach band {user.targetBand}.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
