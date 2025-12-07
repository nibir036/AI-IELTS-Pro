
'use client';

import * as React from 'react';
import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, increment, collection } from 'firebase/firestore';
import type { ListeningTest, ListeningQuestion, ListeningQuestionGroup } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, Loader2, Lightbulb, Info, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

type UserAnswers = Record<string, string | string[]>;

// Memoize the AudioPlayer to prevent re-renders on parent state changes
const AudioPlayer = React.memo(function AudioPlayer({ src }: { src: string }) {
    if (!src) {
        return (
            <div className="flex items-center justify-center w-full h-14 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Audio not available for this part.</p>
            </div>
        );
    }
    return (
        <audio controls src={src} className="w-full">
            Your browser does not support the audio element.
        </audio>
    );
});
AudioPlayer.displayName = 'AudioPlayer';

function ListeningTestComponent({ test }: { test: ListeningTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const startTimeRef = React.useRef<Date | null>(null);

    const [isGraded, setIsGraded] = React.useState(false);
    const [score, setScore] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        startTimeRef.current = new Date();
    }, []);

    const allQuestions = React.useMemo(() => test.parts?.flatMap(p => p.questionGroups?.flatMap(qg => qg.questions)) || [], [test.parts]);
    const totalQuestions = allQuestions.length;

    const methods = useForm<UserAnswers>({
        defaultValues: allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: q.type === 'multiple-choice-multiple-answer' ? [] : '' }), {})
    });
    const { watch, handleSubmit: handleFormSubmit, control } = methods;

    const userAnswers = watch();
    const answeredQuestions = Object.values(userAnswers).filter(val => (Array.isArray(val) ? val.length > 0 : val && val.trim() !== '')).length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    
    const onSubmit = async (data: UserAnswers) => {
        if (!test || !test.answers) return;
        setIsSubmitting(true);

        let correctCount = 0;
        allQuestions.forEach(q => {
            const userAnswer = data[q.id];
            const correctAnswer = test.answers[q.id];
            let isCorrect = false;

            if (q.type === 'multiple-choice-multiple-answer') {
                const correctAnswersSet = new Set(correctAnswer.split(',').sort());
                const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                isCorrect = correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value));
            } else {
                 isCorrect = (userAnswer as string || '').trim().toLowerCase() === correctAnswer.toLowerCase();
            }

            if (isCorrect) {
                correctCount++;
            }
        });
        
        const finalScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 9.0 : 0;
        setScore(finalScore);
        
        if (authUser && firestore && userProfile) {
            const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
            
            const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
            setDocumentNonBlocking(submissionRef, {
                skill: 'Listening',
                testId: test.id,
                inputData: data,
                aiReport: {}, // Explanations will be generated on the submission page
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
            const newTotalSubmissions = (userProfile.totalPracticeTime / 30 || 0) + 1; // Avg 30 mins
            const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

            updateDocumentNonBlocking(userRef, {
                totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 30),
                currentBand: newAverageBand
            });

            toast({
                title: "Practice Complete!",
                description: `Your listening score of ${finalScore.toFixed(1)} has been saved.`,
            });
        }
        setIsGraded(true);
        setIsSubmitting(false);
    };

    const renderQuestionGroup = (group: ListeningQuestionGroup) => {
        return (
            <div key={group.instructions} className="space-y-4 rounded-lg border p-4">
                 <div className="text-sm font-medium text-foreground pb-4 border-b flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div dangerouslySetInnerHTML={{ __html: group.instructions }} />
                </div>
                 <div className="space-y-6">
                    {group.questions.map((q) => renderQuestion(q))}
                 </div>
            </div>
        );
    }
    
    const renderQuestion = (question: ListeningQuestion) => {
        const questionNumberMatch = question.id.match(/\d+$/);
        const questionNumber = questionNumberMatch ? questionNumberMatch[0] : question.id;
        
        const questionTextParts = question.question.split('____');

        return (
            <div key={question.id} className="space-y-2">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 text-xs font-bold text-muted-foreground">{questionNumber}</div>
                    <div className="flex-1">
                        <Controller
                            name={question.id}
                            control={control}
                            render={({ field }) => (
                            <div className="pt-2">
                                {question.type === 'multiple-choice' && (
                                <>
                                    <p className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: question.question }} />
                                    <RadioGroup onValueChange={field.onChange} value={field.value} disabled={isGraded}>
                                    {question.options?.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                        <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                                        </div>
                                    ))}
                                    </RadioGroup>
                                </>
                                )}
                                {question.type === 'multiple-choice-multiple-answer' && (
                                    <>
                                        <p className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: question.question }} />
                                        <div className="space-y-2">
                                            {question.options?.map((option, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <Checkbox
                                                id={`${question.id}-${index}`}
                                                checked={(field.value as string[])?.includes(option)}
                                                onCheckedChange={(checked) => {
                                                    const currentValue = field.value as string[] || [];
                                                    if (checked) {
                                                    field.onChange([...currentValue, option]);
                                                    } else {
                                                    field.onChange(currentValue.filter(v => v !== option));
                                                    }
                                                }}
                                                />
                                                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                                            </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {(question.type === 'fill-in-the-blank' || question.type === 'note-completion') && (
                                   <div className="flex items-center flex-wrap font-medium">
                                        <span>{questionTextParts[0]}</span>
                                        <Input {...field} disabled={isGraded} placeholder="........" className="w-40 inline-block mx-2 h-8" />
                                        <span>{questionTextParts[1]}</span>
                                   </div>
                                )}
                            </div>
                            )}
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (isGraded) {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <Card className="w-full max-w-2xl animate-in fade-in-50">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">Test Complete!</CardTitle>
                        <CardDescription>You scored</CardDescription>
                        <p className="text-7xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                        <p className="text-muted-foreground">({(totalQuestions > 0 ? (score / 9.0) * 100 : 0).toFixed(0)}% accuracy)</p>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-6">You can now review your detailed results, including AI-powered explanations for incorrect answers, on your submissions page.</p>
                        <Button onClick={() => router.push(`/submissions`)} size="lg">
                            View My Submissions <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <FormProvider {...methods}>
            <form onSubmit={handleFormSubmit(onSubmit)}>
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
                            <p className="text-muted-foreground">A full-length listening mock test.</p>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                             <div>
                                <Progress value={progress} className="w-48" />
                                <CardDescription className="pt-2">{answeredQuestions} of {totalQuestions} answered</CardDescription>
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Submit & Grade Full Test
                            </Button>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="part-1" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            {test.parts.map((part) => (
                                <TabsTrigger key={part.part} value={`part-${part.part}`}>Part {part.part}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                        {test.parts.map((part) => (
                             <TabsContent key={part.part} value={`part-${part.part}`} className="mt-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-32rem)]">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{part.title || `Part ${part.part}`}</CardTitle>
                                            <CardDescription>Listen to the audio and answer the questions for this part.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <AudioPlayer src={part.audioUrl || test.audioUrl || ''} />
                                        </CardContent>
                                    </Card>

                                    <Card className="flex flex-col h-full">
                                        <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                                        <CardContent className="flex-1 overflow-hidden">
                                            <ScrollArea className="h-full pr-4">
                                                <div className="space-y-6">
                                                     {(part.questionGroups || []).map((group) => renderQuestionGroup(group))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </form>
        </FormProvider>
    );
}

function TestPageSkeleton() {
    return (
         <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-30rem)]">
                <Card className="flex flex-col h-full">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <Skeleton className="h-14 w-full" />
                    </CardContent>
                </Card>
                <Card className="flex flex-col h-full">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
         </div>
    )
}

function TestDataError() {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Card className="max-w-lg p-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <CardTitle className="mt-4">Test Data Corrupted</CardTitle>
                <CardDescription className="mt-2">
                    This listening test could not be loaded because its data is missing key fields like `parts` or `questionGroups`. Please regenerate it using the Admin Content Factory.
                </CardDescription>
            </Card>
        </div>
    )
}

export default function ListeningTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    const { testId } = use(params);
    const { firestore } = useFirebase();

    const testDocRef = useMemoFirebase(() => {
        if (!firestore || !testId) return null;
        return doc(firestore, 'listeningTests', testId);
    }, [firestore, testId]);

    const { data: test, isLoading } = useDoc<ListeningTest>(testDocRef);

    if (isLoading) {
        return <TestPageSkeleton />;
    }

    if (!test) {
        notFound();
    }
    
    // Validate the test data structure
    if (!test.parts || !Array.isArray(test.parts) || test.parts.length === 0 || !test.parts.every(p => p.questionGroups)) {
      return <TestDataError />;
    }
    
    return <ListeningTestComponent test={test} />;
}
