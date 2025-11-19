
'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ReadingTest, ReadingQuestion, ReadingQuestionType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ChevronRight, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function ReadingTaskSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[80vh] w-full" />
            <Skeleton className="h-[80vh] w-full" />
        </div>
    );
}

type UserAnswers = Record<string, string>;

export default function ReadingTaskPage({ params }: { params: { testId: string } }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const testQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'readingTests', params.testId);
    }, [firestore, params.testId]);

    const { data: test, isLoading } = useDoc<ReadingTest>(testQuery);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);

    const handleAnswerChange = (questionId: string, answer: string) => {
        if (isGraded) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (!test) return;

        let correctCount = 0;
        test.questions.forEach(q => {
            if (userAnswers[q.id] === q.answer) {
                correctCount++;
            }
        });
        const finalScore = (correctCount / test.questions.length) * 9.0;
        setScore(finalScore);
        setIsGraded(true);

        if (user && firestore) {
            try {
                const submissionRef = collection(firestore, 'users', user.uid, 'submissions');
                await addDoc(submissionRef, {
                    skill: 'Reading',
                    testId: test.id,
                    inputData: JSON.stringify(userAnswers),
                    scoreBand: finalScore,
                    timestamp: serverTimestamp(),
                });
                toast({
                    title: "Practice Complete!",
                    description: `Your reading score of ${finalScore.toFixed(1)} has been saved.`,
                });
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: "Submission Failed",
                    description: "Could not save your results.",
                });
                console.error("Error saving submission: ", error);
            }
        }
    };

    if (isLoading) return <ReadingTaskSkeleton />;
    if (!isLoading && !test) notFound();

    const progress = (Object.keys(userAnswers).length / test.questions.length) * 100;

    const renderQuestion = (question: ReadingQuestion) => {
        const userAnswer = userAnswers[question.id];
        const isCorrect = isGraded ? userAnswer === question.answer : undefined;

        const getOptionClass = (option: string) => {
            if (!isGraded) return '';
            if (option === question.answer) return 'text-green-600 font-bold';
            if (option === userAnswer && option !== question.answer) return 'text-red-600';
            return 'text-muted-foreground';
        };

        return (
            <Card key={question.id} className={`p-4 ${isGraded && isCorrect === false ? 'border-red-500' : ''} ${isGraded && isCorrect === true ? 'border-green-500' : ''}`}>
                <div className="flex items-start gap-2">
                     {isGraded ? (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    ) : <HelpCircle className="h-5 w-5 text-muted-foreground mt-1" />}
                    <p className="flex-1 font-medium mb-4">{question.question}</p>
                </div>
                
                <RadioGroup
                    value={userAnswer}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={isGraded}
                >
                    {question.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                            <Label htmlFor={`${question.id}-${index}`} className={getOptionClass(option)}>
                                {option}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </Card>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
            <Card className="flex flex-col">
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
            <Card className="flex flex-col">
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
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {test.questions.map(renderQuestion)}
                            </div>
                        </ScrollArea>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center bg-muted rounded-lg">
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
        </div>
    );
}

    
