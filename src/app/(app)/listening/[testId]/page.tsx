
'use client';

import { useState, useRef, useEffect, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, increment } from 'firebase/firestore';
import type { ListeningTest, ListeningQuestion, ListeningQuestionGroup } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2, Lightbulb, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';


type UserAnswers = Record<string, string | string[]>;

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
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
                    style={{'--thumb-color': 'hsl(var(--primary))'} as React.CSSProperties}
                />
                 <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
            </div>
        </div>
    );
}

function ListeningTestComponent({ test }: { test: ListeningTest }) {
    const { firestore, user: authUser } = useFirebase();
    const { user: userProfile } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();
    const startTimeRef = useRef<Date | null>(null);

    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [isGraded, setIsGraded] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        startTimeRef.current = new Date();
    }, [])
    
    const allQuestions = test.parts.flatMap(p => p.questionGroups.flatMap(qg => qg.questions));
    const totalQuestions = allQuestions.length;

    const handleAnswerChange = (questionId: string, answer: string) => {
        if (isGraded) return;
        const question = allQuestions.find(q => q.id === questionId);
        if (question?.type === 'multiple-choice-multiple-answer') {
            const currentAnswers = (userAnswers[questionId] as string[] || []);
            const newAnswers = currentAnswers.includes(answer)
                ? currentAnswers.filter(a => a !== answer)
                : [...currentAnswers, answer];
            setUserAnswers(prev => ({ ...prev, [questionId]: newAnswers }));
        } else {
            setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
        }
    };


    const handleSubmit = async () => {
        if (!test) return;

        let correctCount = 0;
        allQuestions.forEach(q => {
            const userAnswer = userAnswers[q.id];
            const correctAnswer = q.answer;

            if (q.type === 'multiple-choice-multiple-answer') {
                const correctAnswersSet = new Set(correctAnswer.split(',').map(s => s.trim()).sort());
                const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                if (correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value))) {
                    correctCount++;
                }
            } else {
                if ((userAnswer as string || '').trim().toLowerCase() === correctAnswer.toLowerCase()) {
                    correctCount++;
                }
            }
        });
        const finalScore = (correctCount / totalQuestions) * 9.0;
        setScore(finalScore);
        setIsGraded(true);

        if (authUser && firestore && userProfile) {
            const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
            
            const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
            setDocumentNonBlocking(submissionRef, {
                skill: 'Listening',
                testId: test.id,
                inputData: userAnswers,
                aiReport: {}, // No AI report for listening tests
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
    };
    
    const progress = (Object.keys(userAnswers).length / totalQuestions) * 100;
    
     const renderQuestion = (q: ListeningQuestion) => {
        const userAnswer = userAnswers[q.id];
        const correctAnswer = q.answer;
        const isCorrect = isGraded ? (() => {
            if (q.type === 'multiple-choice-multiple-answer') {
                const correctAnswersSet = new Set(correctAnswer.split(',').map((s:string) => s.trim()).sort());
                const givenAnswersSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).sort());
                return correctAnswersSet.size === givenAnswersSet.size && [...correctAnswersSet].every(value => givenAnswersSet.has(value));
            } else {
                return (userAnswer as string || '').trim().toLowerCase() === correctAnswer.toLowerCase();
            }
        })() : undefined;

        const questionTextParts = q.question.split('____');

        const getOptionClass = (option: string) => {
            if (!isGraded) return '';
            if (correctAnswer.includes(option)) return 'text-green-600 font-bold';
            if (Array.isArray(userAnswer) && userAnswer.includes(option) && !correctAnswer.includes(option)) return 'text-red-600';
            if (!Array.isArray(userAnswer) && userAnswer === option && !correctAnswer.includes(option)) return 'text-red-600';
            return 'text-muted-foreground';
        };

        return (
            <Card key={q.id} className={`p-4 ${isGraded && isCorrect === false ? 'border-red-500' : ''} ${isGraded && isCorrect === true ? 'border-green-500' : ''}`}>
                <div className="flex items-start gap-2 mb-4">
                     {isGraded ? (
                        isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    ) : <HelpCircle className="h-5 w-5 text-muted-foreground mt-1" />}
                    
                    {(q.type === 'note-completion' || q.type === 'fill-in-the-blank' || q.type === 'summary-completion') ? (
                         <div className="flex-1 font-medium flex items-center flex-wrap">
                             <span dangerouslySetInnerHTML={{__html: questionTextParts[0]}} />
                             <Input
                                value={userAnswer as string || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                disabled={isGraded}
                                className="w-40 inline-block mx-2 h-8"
                            />
                             <span dangerouslySetInnerHTML={{__html: questionTextParts[1] || ''}} />
                        </div>
                    ) : (
                        <p className="flex-1 font-medium" dangerouslySetInnerHTML={{__html: q.question}} />
                    )}
                </div>
                
                {q.type === 'multiple-choice' && (
                    <RadioGroup value={userAnswer as string} onValueChange={(value) => handleAnswerChange(q.id, value)} disabled={isGraded} className="pl-6">
                        {q.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${q.id}-${index}`} />
                                <Label htmlFor={`${q.id}-${index}`} className={getOptionClass(option)}>
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}
                 {q.type === 'multiple-choice-multiple-answer' && (
                    <div className="pl-6 space-y-2">
                        {q.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${q.id}-${index}`}
                                    checked={(userAnswer as string[] || []).includes(option)}
                                    onCheckedChange={() => handleAnswerChange(q.id, option)}
                                    disabled={isGraded}
                                />
                                <Label htmlFor={`${q.id}-${index}`} className={getOptionClass(option)}>
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                 {isGraded && !isCorrect && (
                    <div className="mt-3">
                         <p className="text-xs text-green-600 font-semibold mb-2">Correct answer: {q.answer}</p>
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
                     {allQuestions.map(renderQuestion)}
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
                   <ModernAudioPlayer src={test.audioUrl || ''} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Questions</CardTitle>
                     <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
                        <p>{Object.keys(userAnswers).length} of {totalQuestions} answered</p>
                        <Progress value={progress} className="w-1/4" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {test.parts.map((part, partIndex) => (
                        <div key={partIndex} className="space-y-4">
                             <h3 className="text-lg font-bold tracking-tight border-b pb-2">Part {part.part}</h3>
                             {part.questionGroups.map((group, groupIndex) => (
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

function TestPageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-1/4" />
                    <Skeleton className="h-5 w-full" />
                </CardHeader>
                 <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
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
