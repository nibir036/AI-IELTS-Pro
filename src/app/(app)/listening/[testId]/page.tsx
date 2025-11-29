
'use client';

import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, increment, collection } from 'firebase/firestore';
import type { ListeningTest, ListeningQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, Play, Pause, Loader2, Lightbulb, List, Headphones } from 'lucide-react';
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


function AudioPlayer({ 
    url, 
    onReady,
    onPlay,
    onPause,
    onFinish,
}: { 
    url: string;
    onReady: (player: WaveSurfer) => void;
    onPlay: () => void;
    onPause: () => void;
    onFinish: () => void;
}) {
    const waveformRef = React.useRef<HTMLDivElement>(null);
    const wavesurferRef = React.useRef<WaveSurfer | null>(null);

    React.useEffect(() => {
        if (!waveformRef.current) return;
        let isMounted = true;

        import('wavesurfer.js').then(module => {
            if (!isMounted) return;
            const WaveSurfer = module.default;

            const wavesurfer = WaveSurfer.create({
                container: waveformRef.current!,
                waveColor: 'hsl(var(--muted-foreground))',
                progressColor: 'hsl(var(--primary))',
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                height: 80,
                url: url,
            });
            wavesurferRef.current = wavesurfer;

            wavesurfer.on('ready', () => onReady(wavesurfer));
            wavesurfer.on('play', onPlay);
            wavesurfer.on('pause', onPause);
            wavesurfer.on('finish', onFinish);
        });

        return () => {
            isMounted = false;
            wavesurferRef.current?.destroy();
        };
    }, [url, onReady, onPlay, onPause, onFinish]);

    return <div ref={waveformRef} className="w-full h-24 bg-muted rounded-lg" />;
}


function ListeningTestComponent({ test }: { test: ListeningTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();

    const wavesurferRef = React.useRef<WaveSurfer | null>(null);
    const [isPlayerReady, setIsPlayerReady] = React.useState(false);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [hasPlayed, setHasPlayed] = React.useState(false);
    const startTimeRef = React.useRef<Date | null>(null);

    const [isGraded, setIsGraded] = React.useState(false);
    const [score, setScore] = React.useState(0);
    const [explanations, setExplanations] = React.useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const methods = useForm<UserAnswers>({
        defaultValues: test.questions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
    });
    const { watch, handleSubmit: handleFormSubmit, control } = methods;

    const userAnswers = watch();
    const answeredQuestions = Object.values(userAnswers).filter(Boolean).length;
    const progress = (answeredQuestions / test.questions.length) * 100;

    const handlePlayerReady = (player: WaveSurfer) => {
        wavesurferRef.current = player;
        setIsPlayerReady(true);
    };

    const handlePlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
            if (!hasPlayed) {
                setHasPlayed(true);
                if (!startTimeRef.current) {
                    startTimeRef.current = new Date();
                }
            }
        }
    };
    
    const onSubmit = async (data: UserAnswers) => {
        if (!test) return;
        setIsSubmitting(true);
        setIsGraded(true);

        let correctCount = 0;
        test.questions.forEach(q => {
            if (q.type === 'fill-in-the-blank') {
                if (data[q.id]?.trim().toLowerCase() === q.answer.toLowerCase()) {
                    correctCount++;
                }
            } else {
                 if (data[q.id] === q.answer) {
                    correctCount++;
                }
            }
        });
        const finalScore = (correctCount / test.questions.length) * 9.0;
        setScore(finalScore);

        let newExplanations: AnswerExplanations = {};
        if (test.transcript) {
            const incorrectAnswers = test.questions.filter(q => {
                const userAnswer = data[q.id]?.trim().toLowerCase();
                const correctAnswer = q.answer.toLowerCase();
                return userAnswer !== correctAnswer;
            });

            if (incorrectAnswers.length > 0) {
                setIsGeneratingExplanations(true);
                const explanationPromises = incorrectAnswers.map(q => 
                    generateTestCorrectionExplanation({
                        context: test.transcript!,
                        question: q.question,
                        userAnswer: data[q.id] || "No answer",
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
                inputData: data,
                aiReport: newExplanations,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            });

            const userRef = doc(firestore, 'users', authUser.uid);
            const newTotalSubmissions = (userProfile.totalPracticeTime / 15 || 0) + 1;
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
        setIsSubmitting(false);
    };


    const renderQuestion = (question: ListeningQuestion, index: number) => {
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
                
                 <Controller
                    name={question.id as any}
                    control={control}
                    render={({ field }) => (
                         <>
                            {question.type === 'multiple-choice' && (
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
                            
                            {question.type === 'fill-in-the-blank' && (
                                <div className="relative">
                                    <Input {...field} disabled={isGraded} />
                                    {isGraded && !isCorrect && (
                                        <p className="text-xs text-green-600 mt-1">Correct answer: {question.answer}</p>
                                    )}
                                </div>
                            )}
                         </>
                    )}
                />

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
                                <p className="text-xs">{explanation || 'An explanation could not be generated for this answer.'}</p>
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
            <ScrollArea className="flex-1 pr-4 mt-2">
                <div className="space-y-4">
                    {test.questions.map((q, i) => renderQuestion(q, i))}
                </div>
            </ScrollArea>
        </div>
    )

    const QuestionsCard = () => (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Questions</CardTitle>
                {!isGraded && <CardDescription>Answer all questions before submitting.</CardDescription>}
                {isGraded && <CardDescription>Review your results below.</CardDescription>}
            </CardHeader>
             <FormProvider {...methods}>
                <form onSubmit={handleFormSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                    <CardContent className="flex-1 overflow-y-auto">
                        {!isGraded ? (
                            <>
                                <div className="mb-4">
                                    <Progress value={progress} />
                                    <p className="text-xs text-muted-foreground text-center mt-1">{answeredQuestions} of {test.questions.length} answered</p>
                                </div>
                                <div className="space-y-4">
                                    {test.questions.map((q, i) => renderQuestion(q, i))}
                                </div>
                            </>
                        ) : <GradedView />}
                    </CardContent>
                    {!isGraded && (
                        <CardFooter>
                            <Button 
                                type="submit"
                                className="w-full" 
                                disabled={isSubmitting || answeredQuestions !== test.questions.length}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Submit & Grade
                            </Button>
                        </CardFooter>
                    )}
                </form>
            </FormProvider>
        </Card>
    )

    const AudioControlCard = () => (
        <Card>
            <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>Listen to the audio. You will only hear it once. Answer the questions as you listen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <AudioPlayer
                    url={test.audioUrl}
                    onReady={handlePlayerReady}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onFinish={() => setIsPlaying(false)}
                />
                {!isPlayerReady ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <p>Loading audio player...</p>
                    </div>
                ) : (
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
    );

    return (
        <div className="space-y-6">
            <div className="block lg:hidden">
                 <Tabs defaultValue="audio" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="audio"><Headphones className="mr-2"/> Audio</TabsTrigger>
                        <TabsTrigger value="questions"><List className="mr-2"/> Questions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="audio">
                       <AudioControlCard />
                    </TabsContent>
                     <TabsContent value="questions">
                        <QuestionsCard />
                     </TabsContent>
                </Tabs>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-6 h-[calc(100vh-10rem)]">
                <AudioControlCard />
                <QuestionsCard />
            </div>
        </div>
    );
}

function TestPageSkeleton() {
    return (
         <div className="space-y-6">
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
            <div className="lg:hidden space-y-4">
                 <Skeleton className="h-10 w-full" />
                 <Card>
                    <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                 </Card>
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
    
    return <ListeningTestComponent test={test} />;
}
