'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { ListeningTest, ListeningQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2, Lightbulb, List, Headphones } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import type WaveSurfer from 'wavesurfer.js';


type UserAnswers = Record<string, string>;
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

    useEffect(() => {
        if (!waveformRef.current || !test?.audioUrl) return;

        let wavesurfer: WaveSurfer | null = null;
        let isMounted = true;

        import('wavesurfer.js').then(module => {
            if (!isMounted || !waveformRef.current) return;
            const WaveSurfer = module.default;

            wavesurfer = WaveSurfer.create({
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
        });
        
        return () => {
            isMounted = false;
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, [test?.audioUrl]);

    const handlePlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
            if (!hasPlayed) setHasPlayed(true);
        }
    };
    
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

        // Generate explanations for incorrect answers
        let newExplanations: AnswerExplanations = {};
        if (test.transcript) {
            const incorrectAnswers = test.questions.filter(q => {
                const userAnswer = userAnswers[q.id]?.trim().toLowerCase();
                const correctAnswer = q.answer.toLowerCase();
                return userAnswer !== correctAnswer;
            });

            if (incorrectAnswers.length > 0) {
                setIsGeneratingExplanations(true);
                const explanationPromises = incorrectAnswers.map(q => 
                    generateTestCorrectionExplanation({
                        context: test.transcript!,
                        question: q.question,
                        userAnswer: userAnswers[q.id] || "No answer",
                        correctAnswer: q.answer
                    }).then(result => ({ id: q.id, explanation: result.explanation }))
                      .catch(err => {
                        console.error("Error generating explanation for question", q.id, err);
                        return { id: q.id, explanation: "Could not generate explanation at this time."};
                      })
                );

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

    if (!test) notFound();

    const progress = (Object.keys(userAnswers).length / test.questions.length) * 100;

    const renderQuestion = (question: ListeningQuestion) => {
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
                <div className="flex items-start gap-2 mb-4">
                     {isGraded ? (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    ) : <HelpCircle className="h-5 w-5 text-muted-foreground mt-1" />}
                    <p className="flex-1 font-medium">{question.question}</p>
                </div>
                
                {question.type === 'multiple-choice' && (
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
                <div className="space-y-4">
                    {test.questions.map(renderQuestion)}
                </div>
            </ScrollArea>
        </div>
    )

    const UngradedView = () => (
         <>
            <div className="mb-4">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center mt-1">{Object.keys(userAnswers).length} of {test.questions.length} answered</p>
            </div>
            <ScrollArea className="h-[calc(100vh-28rem)] lg:h-full pr-4">
                <div className="space-y-4">
                    {test.questions.map(renderQuestion)}
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
                        disabled={Object.keys(userAnswers).length !== test.questions.length}
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
         <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-40" />
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
                </CardContent>
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
    
    return <ListeningTestComponent test={test} />;
}
