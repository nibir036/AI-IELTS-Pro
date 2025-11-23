'use client';

import { notFound, useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import type { Submission, AiPoweredWritingEvaluationOutput, AiPoweredSpeakingEvaluationOutput, ReadingTest, ListeningTest, ReadingQuestion, ListeningQuestion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BookOpen, CheckCircle, Headphones, Lightbulb, XCircle } from 'lucide-react';
import { WritingEvaluationResults } from '@/components/app/writing/writing-evaluation-results';
import { SpeakingEvaluationResults } from '@/components/app/speaking/speaking-evaluation-results';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection } from '@/firebase/firestore/use-collection';


function ComprehensionTestReview({ submission }: { submission: Submission }) {
    const { firestore } = useFirebase();
    let testRef = null;
    let questions: (ReadingQuestion | ListeningQuestion)[] = [];
    
    if (submission.skill === 'Reading') {
        testRef = useMemoFirebase(() => {
            if (!firestore) return null;
            return doc(firestore, 'readingTests', submission.testId);
        }, [firestore, submission.testId]);
    } else if (submission.skill === 'Listening') {
        testRef = useMemoFirebase(() => {
            if (!firestore) return null;
            return doc(firestore, 'listeningTests', submission.testId);
        }, [firestore, submission.testId]);
    }
    
    const { data: test, isLoading } = useDoc<ReadingTest | ListeningTest>(testRef);
    
    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (!test) {
        return <p>Test content could not be found for this submission.</p>;
    }
    
    questions = test.questions || [];

    const userAnswers = submission.inputData as Record<string, string>;
    const explanations = submission.aiReport as Record<string, string> | null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                {submission.skill === 'Reading' ? <BookOpen className="h-6 w-6 text-primary" /> : <Headphones className="h-6 w-6 text-primary" />}
                <CardTitle>{test.title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                    {questions.map(q => {
                        const userAnswer = userAnswers[q.id] || '';
                        const isCorrect = q.type === 'fill-in-the-blank' 
                            ? userAnswer.trim().toLowerCase() === q.answer.toLowerCase()
                            : userAnswer === q.answer;
                        const explanation = explanations?.[q.id];

                        const getOptionClass = (option: string) => {
                            if (option === q.answer) return 'text-green-600 font-bold';
                            if (option === userAnswer && option !== q.answer) return 'text-red-600';
                            return 'text-muted-foreground';
                        };

                        return (
                        <Card key={q.id} className={`p-4 ${!isCorrect ? 'border-red-500' : 'border-green-500'}`}>
                            <div className="flex items-start gap-2 mb-4">
                            {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />}
                            <p className="flex-1 font-medium">{q.question}</p>
                            </div>

                            {q.type === 'multiple-choice' && (
                            <RadioGroup value={userAnswer} disabled>
                                {q.options?.map((option, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option} id={`${q.id}-${index}`} />
                                    <Label htmlFor={`${q.id}-${index}`} className={getOptionClass(option)}>
                                    {option}
                                    </Label>
                                </div>
                                ))}
                            </RadioGroup>
                            )}

                            {q.type === 'fill-in-the-blank' && (
                            <div>
                                <Input value={userAnswer} disabled />
                                {!isCorrect && <p className="text-xs text-green-600 mt-1">Correct answer: {q.answer}</p>}
                            </div>
                            )}
                            
                            {!isCorrect && explanation && (
                                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                                        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs">{explanation}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                        );
                    })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


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
        if (!submission) {
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
        
        if (submission.skill === 'Reading' || submission.skill === 'Listening') {
        return <ComprehensionTestReview submission={submission} />;
        }
        
        // Fallback for other types
        return (
            <Card>
                <CardHeader><CardTitle>Submission Details</CardTitle></CardHeader>
                <CardContent>
                    <p><strong>Skill:</strong> {submission.skill}</p>
                    <p><strong>Score:</strong> {submission.scoreBand?.toFixed(1) ?? 'N/A'}</p>
                    <p className="text-sm mt-4">Raw Data:</p>
                    <pre className="mt-2 whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                        {JSON.stringify(submission, null, 2)}
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
