'use client';

import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import type { Submission, AiPoweredWritingEvaluationOutput, AiPoweredSpeakingEvaluationOutput } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { WritingEvaluationResults } from '@/components/app/writing/writing-evaluation-results';
import { SpeakingEvaluationResults } from '@/components/app/speaking/speaking-evaluation-results';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function SubmissionPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const { firestore, user } = useFirebase();

  const submissionRef = useMemoFirebase(() => {
    if (!firestore || !user || !submissionId) return null;
    return doc(firestore, 'users', user.uid, 'submissions', submissionId);
  }, [firestore, user, submissionId]);

  const { data: submission, isLoading, error } = useDoc<Submission>(submissionRef);

  const renderResults = () => {
    if (!submission || !submission.aiReport) {
      return (
        <Card>
            <CardHeader><CardTitle>Analysis Not Available</CardTitle></CardHeader>
            <CardContent><p>The AI analysis for this submission could not be loaded.</p></CardContent>
        </Card>
      );
    }
    
    if (submission.skill === 'Writing') {
      return <WritingEvaluationResults result={submission.aiReport as AiPoweredWritingEvaluationOutput} />;
    }

    if (submission.skill === 'Speaking') {
        return <SpeakingEvaluationResults result={submission.aiReport as AiPoweredSpeakingEvaluationOutput} />;
    }
    
    // Fallback for other types
    return (
        <Card>
            <CardHeader><CardTitle>Submission Details</CardTitle></CardHeader>
            <CardContent>
                <p><strong>Skill:</strong> {submission.skill}</p>
                <p><strong>Score:</strong> {submission.scoreBand?.toFixed(1) ?? 'N/A'}</p>
                <pre className="mt-4 whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                    {JSON.stringify(submission.aiReport, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div>
            <h1 className="text-3xl font-bold tracking-tight">Submission Review</h1>
            <p className="text-muted-foreground">Here's the detailed analysis of your practice session.</p>
      </div>

      {isLoading && <SubmissionSkeleton />}
      
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Error Loading Submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading your submission data. It's possible you don't have permission to view this, or the document does not exist.</p>
            <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {submission && (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Session Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Skill</p>
                        <Badge>{submission.skill}</Badge>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                            {submission.timestamp ? format(new Date((submission.timestamp as any).seconds * 1000), 'do MMMM yyyy, h:mm a') : 'N/A'}
                        </p>
                    </div>
                     <div className="text-right">
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-lg font-bold text-primary">{submission.scoreBand?.toFixed(1) ?? 'N/A'}</p>
                    </div>
                </CardContent>
            </Card>
            {renderResults()}
        </>
      )}
    </div>
  );
}

function SubmissionSkeleton() {
  return (
    <div className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
        </div>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-2 w-2/3">
                        <Skeleton className="h-7 w-3/4" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                    <Skeleton className="h-20 w-24" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
            </CardContent>
        </Card>
    </div>
  );
}