
'use client';

import { useState, useEffect, useRef, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { ReadingTest, ReadingQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Lightbulb, Loader2, BookOpen, List } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
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
    const startTimeRef = useRef<Date | null>(null);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);
    const [explanations, setExplanations] = useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);

    useEffect(() => {
        startTimeRef.current = new Date();
    }, []);

    const handleAnswerChange = (questionId: string, answer: string) => {
        if (isGraded) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (!test) return;

        let correctCount = 0;
        test.questions.forEach(q => {
            if (q.type === 'fill-in-the-blank') {
                if (userAnswers[q.id]?.trim().toLowerCase() === q.answer.toLowerCase()) {
                    correctCount++;
                }
            } else {
                if (userAnswers[q.id] === q.answer) {
                    correctCount++;
                }
            }
        });
        const finalScore = (correctCount / test.questions.length) * 9.0;
        setScore(finalScore);
        setIsGraded(true);

        const incorrectAnswers = test.questions.filter(q => {
            const userAnswer = userAnswers[q.id] || '';
            return q.type === 'fill-in-the-blank' 
                ? userAnswer.trim().toLowerCase() !== q.answer.toLowerCase() 
                : userAnswer !== q.answer;
        });

        let newExplanations: AnswerExplanations = {};
        if (incorrectAnswers.length > 0) {
            setIsGeneratingExplanations(true);
            const explanationPromises = incorrectAnswers.map(q => 
                generateTestCorrectionExplanation({
                    context: test.passage,
                    question: q.question,
                    userAnswer: userAnswers[q.id] || "No answer",
                    correctAnswer: q.answer
                }).then(result => ({ id: q.id, explanation: result.explanation }))
                  .catch(err => ({id: q.id, explanation: 'Could not generate explanation.'}))
            );

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
                inputData: userAnswers,
                aiReport: newExplanations,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
            const newTotalSubmissions = (userProfile.totalPracticeTime / 20 || 0) + 1;
            const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

            updateDocumentNonBlocking(userRef, {
                totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 20),
                currentBand: newAverageBand
            });

            toast({
                title: "Practice Complete!",
                description: `Your reading score of ${finalScore.toFixed(1)} has been saved.`,
            });
        }
    };

    const progress = (Object.keys(userAnswers).length / test.questions.length) * 100;

    const renderQuestion = (question: ReadingQuestion, index: number) => {
        const userAnswer = userAnswers[question.id] || '';
        const isCorrect = isGraded ? (
            question.type === 'fill-in-the-blank' 
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
            <Card key={question.id} className={`p-4 ${isGraded && isCorrect === false ? 'border-red-500' : ''} ${isGraded && isCorrect === true ? 'border-green-500' : ''}`}>
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-muted h-7 w-7 text-xs font-bold text-muted-foreground">{index + 1}</div>
                    <p className="flex-1 font-medium">{question.question}</p>
                     {isGraded && (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    )}
                </div>
                
                {(question.type === 'multiple-choice' || question.type === 'true-false-not-given') && (
                    <RadioGroup value={userAnswer} onValueChange={(value) => handleAnswerChange(question.id, value)} disabled={isGraded}>
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

                {question.type === 'fill-in-the-blank' && (
                    <div className="relative">
                        <Input value={userAnswer} onChange={(e) => handleAnswerChange(question.id, e.target.value)} disabled={isGraded} />
                         {isGraded && !isCorrect && (
                            <p className="text-xs text-green-600 mt-1">Correct answer: {question.answer}</p>
                        )}
                    </div>
                )}
                
                 {isGraded && !isCorrect && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-green-600 mb-1">Correct answer: {question.answer}</p>
                        <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                           <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {isGeneratingExplanations && !explanation ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin"/>
                                    <span>Generating explanation...</span>
                                </div>
                            ) : (
                                <p className="text-xs">{explanation}</p>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        );
    };

    const PassageCard = () => (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>{test.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <p className="prose dark:prose-invert max-w-none text-foreground/80 whitespace-pre-line">
                        {test.passage}
                    </p>
                </ScrollArea>
            </CardContent>
        </Card>
    );

    const QuestionsCard = () => (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Questions</CardTitle>
                {!isGraded && <CardDescription>Answer all questions before submitting.</CardDescription>}
                {isGraded && <CardDescription>Review your results below.</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                {!isGraded ? (
                    <>
                        <div className="mb-4">
                            <Progress value={progress} />
                            <p className="text-xs text-muted-foreground text-center mt-1">{Object.keys(userAnswers).length} of {test.questions.length} answered</p>
                        </div>
                        <ScrollArea className="h-[calc(100vh-25rem)] lg:h-full pr-4">
                            <div className="space-y-4">
                                {test.questions.map(renderQuestion)}
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-col items-center justify-center text-center bg-muted rounded-lg p-6 mb-4">
                            <CardTitle className="text-xl">Practice Complete!</CardTitle>
                            <p className="text-muted-foreground mt-2">You scored</p>
                            <p className="text-6xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                            <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}%)</p>
                            <Button asChild className="mt-6">
                                <Link href="/dashboard">
                                    Back to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <ScrollArea className="h-full pr-4 mt-2">
                            <div className="space-y-4">
                                {test.questions.map(renderQuestion)}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
            {!isGraded && (
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={Object.keys(userAnswers).length !== test.questions.length}
                    >
                        Submit & Grade
                    </Button>
                </CardFooter>
            )}
        </Card>
    );

    return (
        <>
            <div className="block lg:hidden">
                <Tabs defaultValue="passage" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="passage"><BookOpen className="mr-2"/> Passage</TabsTrigger>
                        <TabsTrigger value="questions"><List className="mr-2"/> Questions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="passage">
                        <PassageCard />
                    </TabsContent>
                    <TabsContent value="questions">
                        <QuestionsCard />
                    </TabsContent>
                </Tabs>
            </div>

            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
                <PassageCard />
                <QuestionsCard />
            </div>
        </>
    );
}

function TestPageSkeleton() {
    return (
         <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-full mt-4" />
                    <Skeleton className="h-4 w-[90%]" />
                </CardContent>
            </Card>
             <Card className="flex flex-col h-full">
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                     <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </CardContent>
             </Card>
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
    
    return <ReadingTestComponent test={test} />;
}
 
