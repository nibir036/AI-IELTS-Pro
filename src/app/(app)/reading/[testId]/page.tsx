
'use client';

import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { ReadingTest, ReadingQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, Lightbulb, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { generateTestCorrectionExplanation } from '@/ai/flows/generate-test-correction-explanation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

type UserAnswers = Record<string, string>;
type AnswerExplanations = Record<string, string>;

function ReadingTestComponent({ test }: { test: ReadingTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const startTimeRef = React.useRef<Date | null>(null);

    const [isGraded, setIsGraded] = React.useState(false);
    const [score, setScore] = React.useState(0);
    const [explanations, setExplanations] = React.useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const allQuestions = test.parts.flatMap(p => p.questions);
    const totalQuestions = allQuestions.length;

    const methods = useForm<UserAnswers>({
        defaultValues: allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
    });
    const { watch, handleSubmit: handleFormSubmit, control } = methods;

    const userAnswers = watch();
    const answeredQuestions = Object.values(userAnswers).filter(Boolean).length;
    const progress = (answeredQuestions / totalQuestions) * 100;

    React.useEffect(() => {
        startTimeRef.current = new Date();
    }, []);

    const onSubmit = async (data: UserAnswers) => {
        setIsSubmitting(true);
        setIsGraded(true);

        let correctCount = 0;
        allQuestions.forEach(q => {
             const userAnswer = data[q.id] || '';
             const isCorrect = q.type === 'fill-in-the-blank' || q.type === 'note-completion'
                ? userAnswer.trim().toLowerCase() === q.answer.toLowerCase()
                : userAnswer === q.answer;
            if (isCorrect) {
                correctCount++;
            }
        });
        const finalScore = (correctCount / totalQuestions) * 9.0;
        setScore(finalScore);
        
        const incorrectAnswers = allQuestions.filter(q => {
             const userAnswer = data[q.id] || '';
             return (q.type === 'fill-in-the-blank' || q.type === 'note-completion')
                ? userAnswer.trim().toLowerCase() !== q.answer.toLowerCase()
                : userAnswer !== q.answer;
        });

        let newExplanations: AnswerExplanations = {};
        if (incorrectAnswers.length > 0) {
            setIsGeneratingExplanations(true);
            const explanationPromises = incorrectAnswers.map(q => {
                 const relevantPart = test.parts.find(p => p.questions.some(pq => pq.id === q.id));
                 if (!relevantPart) return Promise.resolve({ id: q.id, explanation: 'Could not find relevant passage.' });

                 return generateTestCorrectionExplanation({
                    context: relevantPart.passage,
                    question: q.question,
                    userAnswer: data[q.id] || "No answer",
                    correctAnswer: q.answer
                }).then(result => ({ id: q.id, explanation: result.explanation }))
                  .catch(err => ({id: q.id, explanation: 'Could not generate explanation.'}))
            });

            const results = await Promise.all(explanationPromises);
            results.forEach(res => {
                newExplanations[res.id] = res.explanation;
            });
            setExplanations(newExplanations);
            setIsGeneratingExplanations(false);
        }

        if (authUser && firestore && userProfile) {
            const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
            
            const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
            setDocumentNonBlocking(submissionRef, {
                skill: 'Reading',
                testId: test.id,
                inputData: data,
                aiReport: newExplanations,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
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
        setIsSubmitting(false);
    };

    const renderQuestion = (question: ReadingQuestion) => {
        const userAnswer = userAnswers[question.id] || '';
        const questionNumber = parseInt(question.id.replace('q',''));
        const isCorrect = isGraded ? (
            question.type === 'fill-in-the-blank' || question.type === 'note-completion'
            ? userAnswer.trim().toLowerCase() === question.answer.toLowerCase()
            : userAnswer === question.answer
       ) : undefined;
        const explanation = explanations[question.id];

        const getOptionClass = (option: string) => {
            if (!isGraded) return '';
            if (option === question.answer) return 'text-green-600 font-bold';
            if (option === userAnswer && option !== question.answer) return 'text-red-600';
            return 'text-muted-foreground';
        };

        return (
            <div key={question.id} className="p-4 rounded-lg border bg-background">
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-muted h-7 w-7 text-xs font-bold text-muted-foreground">{questionNumber}</div>
                    <p className="flex-1 font-medium" dangerouslySetInnerHTML={{ __html: question.question }} />
                     {isGraded && (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    )}
                </div>
                
                 <Controller
                    name={question.id as any}
                    control={control}
                    render={({ field }) => (
                         <div className="pl-10">
                            {(question.type === 'multiple-choice' || question.type === 'true-false-not-given' || question.type === 'yes-no-not-given' || question.type === 'matching-headings' || question.type === 'matching-sentence-endings') && (
                                <RadioGroup onValueChange={field.onChange} value={field.value} disabled={isGraded}>
                                    {question.options?.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                                            <Label htmlFor={`${question.id}-${index}`} className={getOptionClass(option)}>
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion' || question.type === 'matching-information') && (
                                <div className="relative">
                                    <Input {...field} disabled={isGraded} />
                                    {isGraded && !isCorrect && (
                                        <p className="text-xs text-green-600 mt-1">Correct answer: {question.answer}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                />
                
                 {isGraded && !isCorrect && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 ml-10">
                        <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                           <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {isGeneratingExplanations && !explanation ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin"/>
                                    <span>Generating explanation...</span>
                                </div>
                            ) : (
                                <p className="text-xs">{explanation || 'An explanation could not be generated for this answer.'}</p>
                            )}
                        </div>
                    </div>
                )}
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
                    <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}% accuracy)</p>
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

    if (isGraded) {
        return <GradedView />;
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
                 <Card>
                    <CardHeader>
                        <Progress value={progress} />
                        <CardDescription className="text-center pt-2">{answeredQuestions} of {totalQuestions} answered</CardDescription>
                    </CardHeader>
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
                                            <p className="prose dark:prose-invert max-w-none text-foreground/80 whitespace-pre-line">{part.passage}</p>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                                 <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>Questions {part.questions[0].id.replace('q','')} - {part.questions[part.questions.length - 1].id.replace('q','')}</CardTitle></CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-full pr-4">
                                             <div className="space-y-4">
                                                {part.questions.map((q) => renderQuestion(q))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
                
                <div className="flex justify-center pt-4">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full md:w-1/2"
                        disabled={isSubmitting || answeredQuestions !== totalQuestions}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Submit & Grade Full Test
                    </Button>
                </div>
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
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-20rem)]">
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
    
    return (
         <div className="animate-in fade-in-50">
             <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
                    <p className="text-muted-foreground">A full-length reading mock test.</p>
                </div>
            </div>
            <ReadingTestComponent test={test} />
        </div>
    );
}
