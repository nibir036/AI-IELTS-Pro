'use client';

import { useState, useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { readingTests } from '@/lib/data';
import type { ReadingTest, ReadingQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ChevronRight, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/use-user-profile';


type UserAnswers = Record<string, string>;

export default function ReadingTaskPage({ params }: { params: { testId: string } }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const { toast } = useToast();
    const startTimeRef = useRef<Date | null>(null);

    const test = readingTests.find(t => t.id === params.testId);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);

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
            if (userAnswers[q.id] === q.answer) {
                correctCount++;
            }
        });
        const finalScore = (correctCount / test.questions.length) * 9.0;
        setScore(finalScore);
        setIsGraded(true);

        if (authUser && firestore && userProfile) {
            const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
            
            // Non-blocking write for submission
            const submissionRef = collection(firestore, 'users', authUser.uid, 'submissions');
             addDoc(submissionRef, {
                skill: 'Reading',
                testId: test.id,
                inputData: JSON.stringify(userAnswers), // Save the actual answers
                aiReport: null, // No AI report for this test type yet
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            }).catch(console.error);

            // Non-blocking write for user profile update
            const userRef = doc(firestore, 'users', authUser.uid);
            // A simple averaging for the current band score
            const newTotalSubmissions = (userProfile.totalPracticeTime / 20 || 0) + 1; // Assuming avg 20 mins per session before
            const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

            updateDoc(userRef, {
                totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 20), // Assume at least 20 mins for a reading test
                currentBand: newAverageBand
            }).catch(console.error);

            toast({
                title: "Practice Complete!",
                description: `Your reading score of ${finalScore.toFixed(1)} has been saved.`,
            });
        }
    };

    if (!test) notFound();

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
                 {isGraded && !isCorrect && (
                    <p className="text-xs text-green-600 mt-2">Correct answer: {question.answer}</p>
                )}
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