
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
import { CheckCircle, XCircle, ChevronRight, HelpCircle, Play, Pause, Loader2, Lightbulb, Info, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { generateTestCorrectionExplanation } from '@/ai/flows/generate-test-correction-explanation';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';


type UserAnswers = Record<string, string | string[]>;
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
    const [volume, setVolume] = useState(1);

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
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('play', () => setIsPlaying(true));
            audio.removeEventListener('pause', () => setIsPlaying(false));
            audio.removeEventListener('ended', () => setIsPlaying(false));
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

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.volume = value[0];
            setVolume(value[0]);
        }
    };

    return (
        <div className="flex items-center gap-4 rounded-full bg-muted p-2 w-full max-w-lg mx-auto">
            <audio ref={audioRef} src={src} preload="metadata" />
            <Button onClick={togglePlayPause} variant="ghost" size="icon" className="rounded-full">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <span className="text-xs font-mono text-muted-foreground w-20">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
            />
            <div className="flex items-center gap-2 w-28">
                 {volume > 0 ? (
                    <Volume2 className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => handleVolumeChange([0])}/>
                ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => handleVolumeChange([1])}/>
                )}
                <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                />
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
    const [explanations, setExplanations] = useState<AnswerExplanations>({});
    const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);
    
    const allQuestions = test.parts.flatMap(p => p.questionGroups.flatMap(qg => qg.questions));
    const totalQuestions = allQuestions.length;

     useEffect(() => {
        startTimeRef.current = new Date();
    }, []);
    
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
            } else if (typeof userAnswer === 'string') {
                 isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
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
                } else if (typeof userAnswer === 'string') {
                    return userAnswer.trim().toLowerCase() !== correctAnswer.toLowerCase();
                }
                return true; // Not answered or wrong type
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
                return typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
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
                    
                    {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion') ? (
                        <div className="flex-1 font-medium flex items-center flex-wrap">
                            <span dangerouslySetInnerHTML={{ __html: questionTextParts[0] }} />
                            <Input value={userAnswer as string} onChange={(e) => handleAnswerChange(question.id, e.target.value)} disabled={isGraded} className="w-40 inline-block mx-2 h-8" />
                            <span dangerouslySetInnerHTML={{ __html: questionTextParts[1] || ''}} />
                        </div>
                    ) : (
                        <p className="flex-1 font-medium" dangerouslySetInnerHTML={{ __html: question.question }} />
                    )}

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
                
                 {(isGraded && !isCorrect) && (
                    <div className="mt-3">
                         {(question.type === 'fill-in-the-blank' || question.type === 'note-completion' || question.type === 'summary-completion') && (
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
                                    <p className="text-xs">{explanation}</p>
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
             <div className="flex flex-col items-center justify-center py-10">
                 <Card className="w-full max-w-4xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Practice Complete!</CardTitle>
                        <CardDescription>You scored</CardDescription>
                        <p className="text-6xl font-bold text-primary my-2">{score.toFixed(1)} / 9.0</p>
                        <p className="text-muted-foreground">({((score / 9.0) * 100).toFixed(0)}%)</p>
                         <div className="pt-4">
                             <Button onClick={() => router.push('/dashboard')}>
                                Back to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="space-y-8">
                                {test.parts.map((part) => (
                                    <div key={part.part}>
                                        <h3 className="text-xl font-bold mb-4 pb-2 border-b">Part {part.part} Results</h3>
                                        <div className="space-y-6">
                                            {(part.questionGroups || []).map((group, groupIndex) => renderQuestionGroup(group, part.part, groupIndex))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{test.title}</CardTitle>
                    <CardDescription>Listen to the audio and answer the questions below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {test.audioUrl ? (
                        <ModernAudioPlayer src={test.audioUrl} />
                    ) : (
                        <div className="flex items-center justify-center h-16 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Audio not available for this test.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Questions</CardTitle>
                    <div className="flex justify-between items-center text-sm text-muted-foreground pt-2">
                        <p>{answeredQuestionsCount} of {totalQuestions} answered</p>
                        <Progress value={progress} className="w-1/4" />
                    </div>
                </CardHeader>
                 <CardContent className="space-y-8">
                    {test.parts.map((part) => (
                        <div key={part.part}>
                             <h3 className="text-xl font-bold mb-4 pb-2 border-b">Part {part.part}</h3>
                             <div className="space-y-6">
                                {(part.questionGroups || []).map((group, groupIndex) => renderQuestionGroup(group, part.part, groupIndex))}
                            </div>
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                     <Button 
                        className="w-full" 
                        onClick={handleSubmit} 
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
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full max-w-lg mx-auto" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                   <Skeleton className="h-8 w-1/3" />
                   <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </CardContent>
                 <CardFooter>
                    <Skeleton className="h-10 w-full" />
                 </CardFooter>
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

    