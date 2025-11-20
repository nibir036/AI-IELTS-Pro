
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { listeningTests } from '@/lib/data';
import type { ListeningTest, ListeningQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

let WaveSurfer: any = null;
if (typeof window !== 'undefined') {
  import('wavesurfer.js').then(module => {
    WaveSurfer = module.default;
  });
}

type UserAnswers = Record<string, string>;

export default function ListeningTaskPage({ params }: { params: { testId: string } }) {
    const { firestore, user } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const test = listeningTests.find(t => t.id === params.testId);

    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<any | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!WaveSurfer || !waveformRef.current || !test?.audioUrl) return;

        const wavesurfer = WaveSurfer.create({
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
        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('finish', () => setIsPlaying(false));
        
        return () => wavesurfer.destroy();
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
            // Case-insensitive and trim whitespace for fill-in-the-blank
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

        if (user && firestore) {
            const submissionRef = collection(firestore, 'users', user.uid, 'submissions');
            const newSubmission = {
                skill: 'Listening',
                testId: test.id,
                inputData: JSON.stringify(userAnswers),
                aiReport: null,
                scoreBand: finalScore,
                timestamp: serverTimestamp(),
            };
            addDoc(submissionRef, newSubmission).catch(console.error);

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
            </Card>
        );
    };

    return (
        <div className="space-y-6">
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
                                 <Button onClick={(e) => { if(hasPlayed) e.preventDefault()}} disabled={isPlaying} className="w-full sm:w-auto">
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
            <div className="grid grid-cols-1 gap-6">
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
                            <ScrollArea className="h-[50vh] pr-4">
                                <div className="space-y-4">
                                    {test.questions.map(renderQuestion)}
                                </div>
                            </ScrollArea>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center bg-muted rounded-lg p-6">
                            <CardTitle className="text-xl">Practice Complete!</CardTitle>
                            <p className="text-muted-foreground mt-2">You scored</p>
                            <p className="text-6xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                            <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}%)</p>
                                <Button onClick={() => router.push('/dashboard')} className="mt-6">
                                Back to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
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
        </div>
    );
}

