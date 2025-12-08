
'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { listeningTests } from '@/lib/data';
import type { ListeningTest, ListeningQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2, Lightbulb, List, Headphones, Info } from 'lucide-react';
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


type UserAnswers = Record<string, string>;
type AnswerExplanations = Record<string, string>;

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function ModernAudioPlayer({ src }: { src: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };

        const setAudioTime = () => setCurrentTime(audio.currentTime);

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
        };
    }, []);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value));
        }
    };

    return (
        <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
            <audio ref={audioRef} src={src} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} preload="metadata" />
            <Button onClick={togglePlayPause} variant="ghost" size="icon">
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-primary/20 rounded-full appearance-none cursor-pointer"
                />
                 <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
            </div>
        </div>
    );
}

export default function ListeningTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const { testId } = use(params);

    const test = listeningTests.find(t => t.id === testId);

    const startTimeRef = useRef<Date | null>(null);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);
    const [explanations, setExplanations] = useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);
    
    useEffect(() => {
        startTimeRef.current = new Date();
    }, [])

    const handleAnswerChange = (questionId: string, answer: string) => {
        if (isGraded) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (!test) return;

        let correctCount = 0;
        test.questions.forEach(q => {
             const userAnswer = userAnswers[q.id] || '';
             const correctAnswer = q.answer;
             if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
                correctCount++;
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
                 try {
                    let tempExplanations: AnswerExplanations = {};
                    for (const q of incorrectAnswers) {
                      const result = await generateTestCorrectionExplanation({
                        context: test.transcript!,
                        question: q.question,
                        userAnswer: userAnswers[q.id] || "No answer",
                        correctAnswer: q.answer
                      });
                      tempExplanations[q.id] = result.explanation;
                       // Update state after each explanation is generated
                      setExplanations(prev => ({...prev, ...tempExplanations}));
                    }
                } catch (err) {
                    console.error("Error generating explanations sequentially", err);
                    toast({
                        variant: 'destructive',
                        title: 'AI Error',
                        description: 'Could not generate all explanations.'
                    });
                } finally {
                    setIsGeneratingExplanations(false);
                }
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
        const isCorrect = isGraded ? (userAnswer.trim().toLowerCase() === question.answer.toLowerCase()) : undefined;
        const explanation = explanations[question.id];
        const questionTextParts = question.question.split('____');

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
                    
                    {(question.type === 'note-completion' || question.type === 'fill-in-the-blank') ? (
                         <div className="flex-1 font-medium flex items-center flex-wrap">
                             <span dangerouslySetInnerHTML={{__html: questionTextParts[0]}} />
                             <Input
                                value={userAnswer}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                disabled={isGraded}
                                className="w-40 inline-block mx-2 h-8"
                            />
                             <span dangerouslySetInnerHTML={{__html: questionTextParts[1] || ''}} />
                        </div>
                    ) : (
                        <p className="flex-1 font-medium" dangerouslySetInnerHTML={{__html: question.question}} />
                    )}
                </div>
                
                {question.type === 'multiple-choice' && (
                    <RadioGroup value={userAnswer} onValueChange={(value) => handleAnswerChange(question.id, value)} disabled={isGraded} className="pl-6">
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

                 {isGraded && !isCorrect && (
                    <div className="mt-3">
                         {(question.type === 'note-completion' || question.type === 'fill-in-the-blank') && (
                            <p className="text-xs text-green-600 font-semibold mb-2">Correct answer: {question.answer}</p>
                        )}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {isGeneratingExplanations && !explanation ? (
                                    <div className="flex items-center gap-2 text-xs">
                                        <Loader2 className="h-3 w-3 animate-spin"/>
                                        <span>Generating explanation...</span>
                                    </div>
                                ) : (
                                    <p className="text-xs">{explanation || "Explanation will be generated for incorrect answers."}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        );
    };

    if (isGraded) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                 <Card className="text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Practice Complete!</CardTitle>
                        <CardDescription>You scored</CardDescription>
                        <p className="text-6xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                        <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}%)</p>
                    </CardHeader>
                    <CardContent>
                         <Button onClick={() => router.push('/dashboard')} size="lg">
                            Back to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">Review Your Answers</h2>
                     {test.questions.map(renderQuestion)}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{test.title}</CardTitle>
                    <CardDescription>Listen to the audio and answer the questions below. You can submit at any time to see your score.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ModernAudioPlayer src={test.audioUrl} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Questions</CardTitle>
                     <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
                        <p>{Object.keys(userAnswers).length} of {test.questions.length} answered</p>
                        <Progress value={progress} className="w-1/4" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {(test.questionGroups || [{instructions: '', questions: test.questions}]).map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-4">
                            {group.instructions && (
                                <div className="text-sm font-medium text-foreground pb-2 border-b flex items-start gap-2">
                                    <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                    <p>{group.instructions}</p>
                                </div>
                            )}
                             <div className="space-y-4">
                                {group.questions.map(renderQuestion)}
                            </div>
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={handleSubmit} 
                        size="lg"
                    >
                        Submit & Grade Test
                    </Button>
                </CardFooter>
             </Card>
        </div>
    );
}
