
'use client';

import * as React from 'react';
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
import { CheckCircle, XCircle, ChevronRight, Play, Pause, Loader2, Lightbulb, List, Headphones, Info } from 'lucide-react';
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

    const allQuestions = React.useMemo(() => test.parts?.flatMap(p => p.questions) || [], [test.parts]);
    const totalQuestions = allQuestions.length;

    const methods = useForm<UserAnswers>({
        defaultValues: allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
    });
    const { watch, handleSubmit: handleFormSubmit, control } = methods;

    const userAnswers = watch();
    const answeredQuestions = Object.values(userAnswers).filter(val => val && val.trim() !== '').length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

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
        

        let correctCount = 0;
        allQuestions.forEach(q => {
            const userAnswer = data[q.id] || '';
            const isCorrect = (q.type === 'fill-in-the-blank' || q.type === 'note-completion')
                ? userAnswer.trim().toLowerCase() === q.answer.toLowerCase()
                : userAnswer === q.answer;
            if (isCorrect) {
                correctCount++;
            }
        });
        
        const finalScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 9.0 : 0;
        setScore(finalScore);

        const incorrectQuestions = allQuestions.filter(q => {
            const userAnswer = data[q.id] || '';
            const isCorrect = (q.type === 'fill-in-the-blank' || q.type === 'note-completion')
                ? userAnswer.trim().toLowerCase() === q.answer.toLowerCase()
                : userAnswer === q.answer;
            return !isCorrect;
        });

        let newExplanations: AnswerExplanations = {};
        if (incorrectQuestions.length > 0) {
            setIsGeneratingExplanations(true);
            const explanationPromises = incorrectQuestions.map(q => {
                const relevantPart = test.parts.find(p => p.questions.some(pq => pq.id === q.id));
                 if (!relevantPart?.transcript) return Promise.resolve({ id: q.id, explanation: 'Could not find relevant transcript.' });

                return generateTestCorrectionExplanation({
                    context: relevantPart.transcript,
                    question: q.question,
                    userAnswer: data[q.id] || "No answer",
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


    const renderQuestion = (question: ListeningQuestion) => {
        const questionNumber = parseInt(question.id.replace('q', ''));
        const userAnswer = userAnswers[question.id] || '';
        const isCorrect = isGraded ? (
             (question.type === 'fill-in-the-blank' || question.type === 'note-completion') 
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
            <div key={question.id} className="space-y-4">
                 {question.instructions && (
                    <div className="bg-muted/50 p-3 rounded-lg border text-sm text-foreground">
                        <div className="flex items-start gap-2">
                           <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                           <div dangerouslySetInnerHTML={{ __html: question.instructions }} />
                        </div>
                    </div>
                )}
                 <Card className={`p-4 ${isGraded && isCorrect === false ? 'border-red-500' : ''} ${isGraded && isCorrect === true ? 'border-green-500' : ''}`}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-muted h-7 w-7 text-xs font-bold text-muted-foreground">{questionNumber}</div>
                        <p className="flex-1 font-medium">{question.question}</p>
                        {isGraded && (
                            isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                        )}
                    </div>
                
                    <Controller
                        name={question.id as any}
                        control={control}
                        render={({ field }) => (
                            <div className="pl-10">
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
                                
                                {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion') && (
                                    <div className="relative">
                                        <Input {...field} disabled={isGraded} placeholder="Your answer" />
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
                </Card>
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
                            {test.parts.map(part => (
                                <TabsTrigger key={part.part} value={`part-${part.part}`}>Part {part.part}</TabsTrigger>
                            ))}
                        </TabsList>
                        
                         <TabsContent value="part-1" className="mt-4">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-32rem)]">
                                 <AudioControlCard />
                                <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>Questions {test.parts[0].questions[0].id.replace('q','')} - {test.parts[0].questions[test.parts[0].questions.length - 1].id.replace('q','')}</CardTitle></CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-full pr-4">
                                            <div className="space-y-4">
                                                {test.parts[0].questions.map((q) => renderQuestion(q))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {test.parts.slice(1).map((part) => (
                             <TabsContent key={part.part} value={`part-${part.part}`} className="mt-4">
                                 <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle>Questions {part.questions[0].id.replace('q','')} - {part.questions[part.questions.length - 1].id.replace('q','')}</CardTitle></CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
                                            <div className="space-y-4">
                                                {part.questions.map((q) => renderQuestion(q))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
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
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-40" />
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

     if (!test.parts || test.parts.length === 0) {
        return (
             <div className="flex items-center justify-center h-full">
                <p>This test is not formatted correctly and cannot be displayed.</p>
            </div>
        );
    }
    
    return <ListeningTestComponent test={test} />;
}

    