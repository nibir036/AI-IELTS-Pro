
'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { ListeningTest, ListeningQuestion, ListeningQuestionGroup } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2, Lightbulb, List, Headphones, Info, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useUserProfile } from '@/hooks/use-user-profile';
import { generateTestCorrectionExplanation } from '@/ai/flows/generate-test-correction-explanation';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type WaveSurfer from 'wavesurfer.js';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';


type UserAnswers = Record<string, string | string[]>;
type AnswerExplanations = Record<string, string>;


function ListeningTestComponent({ test }: { test: ListeningTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();

    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);
    const startTimeRef = useRef<Date | null>(null);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);
    const [explanations, setExplanations] = useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);

    // State to hold the dynamically imported WaveSurfer module
    const [waveSurferModule, setWaveSurferModule] = useState<any>(null);
    
    const allQuestions = test.parts.flatMap(p => p.questionGroups.flatMap(qg => qg.questions));
    const totalQuestions = allQuestions.length;


    useEffect(() => {
        // Dynamically import WaveSurfer on the client side
        import('wavesurfer.js').then(module => {
            setWaveSurferModule(module.default);
        });
    }, []);


    useEffect(() => {
        if (!waveSurferModule || !waveformRef.current || !test?.audioUrl) return;
        if(wavesurferRef.current) return;

        const wavesurfer = waveSurferModule.create({
            container: waveformRef.current,
            waveColor: 'hsl(var(--muted-foreground))',
            progressColor: 'hsl(var(--primary))',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
            url: test.audioUrl,
        });
        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => setIsPlayerReady(true));
        wavesurfer.on('play', () => {
            setIsPlaying(true);
            if (!startTimeRef.current) {
                startTimeRef.current = new Date();
            }
        });
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('finish', () => setIsPlaying(false));
        
        return () => wavesurfer.destroy();
    }, [waveSurferModule, test?.audioUrl]);

    const handlePlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
            if (!hasPlayed) setHasPlayed(true);
        }
    };
    
    const handleAnswerChange = (questionId: string, answer: string | string[]) => {
        if (isGraded) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (!test) return;

        let correctCount = 0;
        allQuestions.forEach(q => {
            const userAnswer = userAnswers[q.id];
            const correctAnswer = q.answer;
            let isCorrect = false;

            if (q.type === 'multiple-choice-multiple-answer') {
                const correctAnswersSet = new Set(correctAnswer.split(',').map(s => s.trim()).sort());
                const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                isCorrect = correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value));
            } else {
                 isCorrect = (userAnswer as string || '').trim().toLowerCase() === correctAnswer.toLowerCase();
            }

            if (isCorrect) {
                correctCount++;
            }
        });

        const finalScore = (correctCount / totalQuestions) * 9.0;
        setScore(finalScore);
        setIsGraded(true);

        // Generate explanations for incorrect answers
        let newExplanations: AnswerExplanations = {};
        if (test.parts.every(p => p.transcript)) {
            const incorrectAnswers = allQuestions.filter(q => {
                 const userAnswer = userAnswers[q.id];
                 const correctAnswer = q.answer;
                 if (q.type === 'multiple-choice-multiple-answer') {
                    const correctAnswersSet = new Set(correctAnswer.split(',').map(s => s.trim()).sort());
                    const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                    return !(correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value)));
                } else {
                    return (userAnswer as string || '').trim().toLowerCase() !== correctAnswer.toLowerCase();
                }
            });

            if (incorrectAnswers.length > 0) {
                setIsGeneratingExplanations(true);
                const explanationPromises = incorrectAnswers.map(q => {
                    const part = test.parts.find(p => p.questionGroups.some(qg => qg.questions.some(qq => qq.id === q.id)));
                    return generateTestCorrectionExplanation({
                        context: part!.transcript,
                        question: q.question,
                        userAnswer: Array.isArray(userAnswers[q.id]) ? (userAnswers[q.id] as string[]).join(', ') : userAnswers[q.id] as string || "No answer",
                        correctAnswer: q.answer
                    }).then(result => ({ id: q.id, explanation: result.explanation }))
                      .catch(err => {
                        console.error("Error generating explanation for question", q.id, err);
                        return { id: q.id, explanation: "Could not generate explanation at this time."};
                      })
                });

                const results = await Promise.all(explanationPromises);
                results.forEach(res => {
                    newExplanations[res.id] = res.explanation;
                });
                setExplanations(newExplanations);
                setIsGeneratingExplanations(false);
            }
        }
        
        if (authUser && firestore && userProfile) {
            const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
            
            const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
            setDocumentNonBlocking(submissionRef, {
                skill: 'Listening',
                testId: test.id,
                inputData: userAnswers,
                aiReport: newExplanations,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
            const newTotalSubmissions = (userProfile.totalPracticeTime / 15 || 0) + 1; // Assuming avg 15 mins per session before
            const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + finalScore) / newTotalSubmissions;

            updateDocumentNonBlocking(userRef, {
                totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 1),
                currentBand: newAverageBand
            });

            toast({
                title: "Practice Complete!",
                description: `Your listening score of ${finalScore.toFixed(1)} has been saved.`,
            });
        }
    };
    
    const answeredQuestionsCount = Object.values(userAnswers).filter(val => (Array.isArray(val) ? val.length > 0 : val && val.trim() !== '')).length;
    const progress = totalQuestions > 0 ? (answeredQuestionsCount / totalQuestions) * 100 : 0;

    const renderQuestionGroup = (group: ListeningQuestionGroup, partNumber: number, groupIndex: number) => {
        return (
            <div key={`${partNumber}-${groupIndex}`} className="space-y-4 rounded-lg border p-4">
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
        const userAnswer = userAnswers[question.id] || [];
        const isCorrect = isGraded ? (() => {
            const correctAnswer = question.answer;
            if (question.type === 'multiple-choice-multiple-answer') {
                const correctAnswersSet = new Set(correctAnswer.split(',').map(s => s.trim()).sort());
                const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                return correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value));
            } else {
                return (userAnswer as string || '').trim().toLowerCase() === correctAnswer.toLowerCase();
            }
        })() : undefined;

        const explanation = explanations[question.id];

        const getOptionClass = (option: string) => {
            if (!isGraded) return '';
            const correctAnswers = question.answer.split(',').map(s => s.trim());
            const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];

            if (correctAnswers.includes(option)) return 'text-green-600 font-bold';
            if (userAnswersArray.includes(option) && !correctAnswers.includes(option)) return 'text-red-600';
            return 'text-muted-foreground';
        };
        
        const questionTextParts = question.question.split('____');

        return (
            <Card key={question.id} className={`p-4 ${isGraded && isCorrect === false ? 'border-red-500' : ''} ${isGraded && isCorrect === true ? 'border-green-500' : ''}`}>
                <div className="flex items-start gap-2 mb-4">
                     {isGraded ? (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    ) : <HelpCircle className="h-5 w-5 text-muted-foreground mt-1" />}
                    <p className="flex-1 font-medium" dangerouslySetInnerHTML={{ __html: question.question }} />
                </div>
                
                {question.type === 'multiple-choice' && (
                    <RadioGroup onValueChange={(value) => handleAnswerChange(question.id, value)} disabled={isGraded}>
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

                {question.type === 'multiple-choice-multiple-answer' && (
                     <div className="space-y-2">
                        {question.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${question.id}-${index}`}
                                    checked={(userAnswer as string[]).includes(option)}
                                    onCheckedChange={(checked) => {
                                        const currentValue = (userAnswer as string[]) || [];
                                        if (checked) {
                                            handleAnswerChange(question.id, [...currentValue, option]);
                                        } else {
                                            handleAnswerChange(question.id, currentValue.filter((v) => v !== option));
                                        }
                                    }}
                                    disabled={isGraded}
                                />
                                <Label htmlFor={`${question.id}-${index}`} className={getOptionClass(option)}>{option}</Label>
                            </div>
                        ))}
                    </div>
                )}
                
                {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion') && (
                    <div className="relative">
                        <div className="flex items-center flex-wrap font-medium">
                             <span dangerouslySetInnerHTML={{ __html: questionTextParts[0] }} />
                             <Input value={userAnswer as string} onChange={(e) => handleAnswerChange(question.id, e.target.value)} disabled={isGraded} className="w-40 inline-block mx-2 h-8" />
                             <span dangerouslySetInnerHTML={{ __html: questionTextParts[1] || ''}} />
                        </div>
                         {isGraded && !isCorrect && (
                            <p className="text-xs text-green-600 mt-1">Correct answer: {question.answer}</p>
                        )}
                    </div>
                )}
                
                 {isGraded && !isCorrect && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
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

    const GradedView = () => (
         <div className="flex flex-col h-full">
            <div className="flex flex-col items-center justify-center text-center bg-muted rounded-lg p-6 mb-4">
                <CardTitle className="text-xl">Practice Complete!</CardTitle>
                <p className="text-muted-foreground mt-2">You scored</p>
                <p className="text-6xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}%)</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-6">
                    Back to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="h-full pr-4 mt-2">
                 <div className="space-y-8">
                    {test.parts.map((part) => (
                        <Card key={part.part}>
                            <CardHeader>
                                <CardTitle>Part {part.part}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(part.questionGroups || []).map((group, groupIndex) => renderQuestionGroup(group, part.part, groupIndex))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )

    const UngradedView = () => (
         <>
            <div className="mb-4">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center mt-1">{answeredQuestionsCount} of {totalQuestions} answered</p>
            </div>
            <ScrollArea className="h-[calc(100vh-28rem)] lg:h-full pr-4">
                 <div className="space-y-8">
                    {test.parts.map((part) => (
                        <Card key={part.part}>
                            <CardHeader>
                                <CardTitle>Part {part.part}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(part.questionGroups || []).map((group, groupIndex) => renderQuestionGroup(group, part.part, groupIndex))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </>
    )

    const QuestionsCard = () => (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Questions</CardTitle>
                {!isGraded && <CardDescription>Answer all questions before submitting.</CardDescription>}
                {isGraded && <CardDescription>Review your results below.</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                { isGraded ? <GradedView /> : <UngradedView /> }
            </CardContent>
            {!isGraded && (
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={handleSubmit} 
                        disabled={answeredQuestionsCount !== totalQuestions}
                    >
                        Submit & Grade
                    </Button>
                </CardFooter>
            )}
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="block lg:hidden">
                 <Tabs defaultValue="audio" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="audio"><Headphones className="mr-2"/> Audio</TabsTrigger>
                        <TabsTrigger value="questions"><List className="mr-2"/> Questions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="audio">
                        <Card>
                            <CardHeader>
                                <CardTitle>{test.title}</CardTitle>
                                <CardDescription>Listen to the audio. You will only hear it once. Answer the questions as you listen.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div ref={waveformRef} className="w-full h-24 bg-muted rounded-lg" />
                                 {!isPlayerReady ? (
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        <p>Loading audio player...</p>
                                    </div>
                                ): (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button onClick={(e) => { if(hasPlayed) { e.preventDefault(); } }} disabled={isPlaying || hasPlayed} className="w-full sm:w-auto">
                                                {isPlaying ? <Pause className="mr-2"/> : <Play className="mr-2"/>}
                                                {hasPlayed ? 'Audio can only be played once' : isPlaying ? 'Playing...' : 'Play Audio'}
                                            </Button>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Start the listening test?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                In an real IELTS test, the audio is played only once. Click "Play" to start the test. You will not be able to pause or replay the audio.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogAction onClick={handlePlayPause}>Play</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="questions">
                        <QuestionsCard />
                     </TabsContent>
                </Tabs>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
                <Card>
                    <CardHeader>
                        <CardTitle>{test.title}</CardTitle>
                        <CardDescription>Listen to the audio. You will only hear it once. Answer the questions as you listen.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div ref={waveformRef} className="w-full h-24 bg-muted rounded-lg" />
                        {!isPlayerReady ? (
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin"/>
                                <p>Loading audio player...</p>
                            </div>
                        ): (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button onClick={(e) => { if(hasPlayed) { e.preventDefault(); } }} disabled={isPlaying || hasPlayed} className="w-full sm:w-auto">
                                        {isPlaying ? <Pause className="mr-2"/> : <Play className="mr-2"/>}
                                        {hasPlayed ? 'Audio can only be played once' : isPlaying ? 'Playing...' : 'Play Audio'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Start the listening test?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        In an real IELTS test, the audio is played only once. Click "Play" to start the test. You will not be able to pause or replay the audio.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogAction onClick={handlePlayPause}>Play</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardContent>
                </Card>
                <QuestionsCard />
            </div>
        </div>
    );
}

function TestPageSkeleton() {
    return (
         <div className="space-y-6">
            <div className="hidden lg:grid grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
                <Card className="flex flex-col h-full">
                    <CardHeader>
                       <Skeleton className="h-8 w-1/3" />
                       <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                       <Skeleton className="h-6 w-full mb-4" />
                       <Skeleton className="h-full w-full" />
                    </CardContent>
                     <CardFooter>
                        <Skeleton className="h-10 w-full" />
                     </CardFooter>
                </Card>
            </div>
             <div className="block lg:hidden">
                <Skeleton className="h-screen w-full" />
            </div>
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
    
    if (!test.parts) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Card className="max-w-lg p-8">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                    <CardTitle className="mt-4">Test Data Corrupted</CardTitle>
                    <CardDescription className="mt-2">
                        This listening test could not be loaded because its data is missing key fields like `parts`. Please regenerate it using the Admin Content Factory.
                    </CardDescription>
                </Card>
            </div>
        );
    }
    
    return (
         <div className="animate-in fade-in-50">
            <ListeningTestComponent test={test} />
        </div>
    );
}
