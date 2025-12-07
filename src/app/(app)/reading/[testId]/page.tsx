
'use client';

import * as React from 'react';
import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, increment } from 'firebase/firestore';
import type { ReadingTest, ReadingQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, Lightbulb, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

type UserAnswers = Record<string, string>;

function ReadingTestComponent({ test }: { test: ReadingTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const startTimeRef = React.useRef<Date | null>(null);

    const [isGraded, setIsGraded] = React.useState(false);
    const [score, setScore] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const allQuestions = React.useMemo(() => test.parts?.flatMap(p => p.questions) || [], [test.parts]);
    const totalQuestions = allQuestions.length;


    const methods = useForm<UserAnswers>({
        defaultValues: allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
    });
    const { watch, handleSubmit: handleFormSubmit, control } = methods;

    const userAnswers = watch();
    const answeredQuestions = Object.values(userAnswers).filter(val => val && val.trim() !== '').length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    React.useEffect(() => {
        startTimeRef.current = new Date();
    }, []);

    const onSubmit = async (data: UserAnswers) => {
        setIsSubmitting(true);

        let correctCount = 0;
        allQuestions.forEach(q => {
            const userAnswer = data[q.id] || '';
            const isCorrect = userAnswer.trim().toLowerCase() === q.answer.toLowerCase();
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
                skill: 'Reading',
                testId: test.id,
                inputData: data,
                aiReport: {}, // No AI report for reading tests
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
            // Rough estimate of 60 mins for a full reading test.
            const newTotalSubmissions = (userProfile.totalPracticeTime / 60 || 0) + 1;
            const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

            updateDocumentNonBlocking(userRef, {
                totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 60),
                currentBand: newAverageBand
            });

            toast({
                title: "Practice Complete!",
                description: `Your reading score of ${finalScore.toFixed(1)} has been saved.`,
            });
        }
        setIsGraded(true); // Set graded state after all processing
        setIsSubmitting(false);
    };

    const renderQuestion = (question: ReadingQuestion, index: number) => {
        const questionNumber = index + 1;

        const getOptionsForType = (q: ReadingQuestion) => {
            if (q.type === 'true-false-not-given') return ['True', 'False', 'Not Given'];
            if (q.type === 'yes-no-not-given') return ['Yes', 'No', 'Not Given'];
            return q.options || [];
        }

        const options = getOptionsForType(question);

        return (
             <div key={question.id} className="space-y-4">
                {question.instructions && (
                    <div className="bg-muted/50 p-3 rounded-lg border text-sm text-foreground">
                        <div className="flex items-start gap-2">
                           <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                           <div dangerouslySetInnerHTML={{ __html: question.instructions }} />
                        </div>
                        {question.type !== 'summary-completion' && question.answerBox && (
                             <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 p-3 border-t">
                                {question.answerBox.map((opt, idx) => <p key={idx} className="text-xs text-muted-foreground">{opt}</p>)}
                            </div>
                        )}
                         {(question.type === 'matching-sentence-endings' || question.type === 'matching-headings') && question.options && (
                             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 p-3 border-t">
                                {question.options.map((opt, idx) => <p key={idx} className="text-xs text-muted-foreground">{opt}</p>)}
                            </div>
                        )}
                    </div>
                )}
                <div className="p-4 rounded-lg border bg-background">
                     <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-muted h-7 w-7 text-xs font-bold text-muted-foreground">{questionNumber}</div>
                         <p className="flex-1 font-medium" dangerouslySetInnerHTML={{ __html: question.question }} />
                    </div>
                    <Controller
                        name={question.id as any}
                        control={control}
                        render={({ field }) => (
                            <div className="pl-10">
                                {(question.type === 'multiple-choice' || question.type === 'true-false-not-given' || question.type === 'yes-no-not-given' || question.type === 'matching-sentence-endings') && (
                                    <RadioGroup onValueChange={field.onChange} value={field.value} disabled={isGraded}>
                                        {options.map((option, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                                <Label htmlFor={`${question.id}-${index}`}>
                                                    {option}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}

                                 {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion' || question.type === 'matching-information' || question.type === 'matching-headings') && (
                                    <div className="relative">
                                        <Input {...field} disabled={isGraded} placeholder="Your answer"/>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>
        );
    };

    const GradedView = () => (
         <div className="flex flex-col h-full items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Test Complete!</CardTitle>
                    <CardDescription>You scored</CardDescription>
                    <p className="text-7xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                    <p className="text-muted-foreground">({(totalQuestions > 0 ? (score / 9.0) * 100 : 0).toFixed(0)}% accuracy)</p>
                </CardHeader>
                 <CardContent className="text-center">
                     <p className="text-muted-foreground mb-6">You can now review your detailed results, including correct and incorrect answers, on your submissions page.</p>
                    <Button onClick={() => router.push(`/submissions`)} size="lg">
                        View My Submissions <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    if (isGraded) {
        return <GradedView />;
    }
    
    const renderPassage = (passageText: string) => {
        // Split by one or more newlines, trim each resulting line, and filter out empty ones.
        const paragraphs = passageText.split(/\n\s*\n/).filter(p => p.trim() !== '');
        return paragraphs.map((para, index) => (
            <p key={index} className="text-foreground/80 leading-relaxed mb-4">{para.trim()}</p>
        ));
    };
    

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
                        <p className="text-muted-foreground">A full-length reading mock test.</p>
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
                    <TabsList className="grid w-full grid-cols-3">
                        {test.parts.map(part => (
                             <TabsTrigger key={part.part} value={`part-${part.part}`}>Part {part.part}</TabsTrigger>
                        ))}
                    </TabsList>
                    {test.parts.map((part) => (
                        <TabsContent key={part.part} value={`part-${part.part}`} className="mt-4">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-32rem)]">
                                <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>{part.title}</CardTitle></CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-full pr-4">
                                            <div className="prose dark:prose-invert max-w-none">
                                                {renderPassage(part.passage)}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                                 <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-full pr-4">
                                             <div className="space-y-4">
                                                {part.questions.map((q, index) => renderQuestion(q, allQuestions.findIndex(aq => aq.id === q.id)))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </form>
        </FormProvider>
    );
}

function TestPageSkeleton() {
    return (
         <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-30rem)]">
                <Card className="flex flex-col h-full">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[80%]" />
                         <Skeleton className="h-4 w-full mt-4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[70%]" />
                    </CardContent>
                </Card>
                <Card className="flex flex-col h-full">
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
         </div>
    )
}

export default function ReadingTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    const { testId } = use(params);
    const { firestore } = useFirebase();

    const testDocRef = useMemoFirebase(() => {
        if (!firestore || !testId) return null;
        return doc(firestore, 'readingTests', testId);
    }, [firestore, testId]);

    const { data: test, isLoading } = useDoc<ReadingTest>(testDocRef);

    if (isLoading) {
        return <TestPageSkeleton />;
    }

    if (!test) {
        notFound();
    }
    
    if (!test.parts) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Card className="max-w-lg p-8">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                    <CardTitle className="mt-4">Test Data Corrupted</CardTitle>
                    <CardDescription className="mt-2">
                        This reading test could not be loaded because its data is missing key fields like `parts`. Please regenerate it using the Admin Content Factory.
                    </CardDescription>
                </Card>
            </div>
        );
    }
    
    return (
         <div className="animate-in fade-in-50">
            <ReadingTestComponent test={test} />
        </div>
    );
}
