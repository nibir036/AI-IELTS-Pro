
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { generatePersonalizedLearningPath } from '@/ai/flows/personalized-learning-path';
import type { Lesson, User, LearningPath as LearningPathType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, documentId, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


interface LearningPathProps {
  user: User;
}

const ShimmerSkeleton = () => (
    <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
             <div key={i} className="h-16 rounded-lg border flex items-center p-3 gap-4 overflow-hidden relative bg-muted/50">
                <div 
                    className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-background/30 to-transparent"
                />
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/4 rounded" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        ))}
    </div>
);


function RecommendedLessons({ lessonIds }: { lessonIds: string[] }) {
    const { firestore } = useFirebase();

    const lessonsQuery = useMemoFirebase(() => {
        if (!firestore || lessonIds.length === 0) return null;
        // Firestore 'in' query is limited to 30 items, but we only show a few.
        return query(collection(firestore, 'lessons'), where(documentId(), 'in', lessonIds.slice(0, 10)));
    }, [firestore, lessonIds]);

    const { data: recommendedLessons, isLoading } = useCollection<Lesson>(lessonsQuery);

    if (isLoading) {
        return <ShimmerSkeleton />;
    }
    
    if (!recommendedLessons || recommendedLessons.length === 0) {
        return <p className="text-center text-muted-foreground">No recommended lessons found.</p>;
    }
    
    // Sort lessons to match the order from the learning path
    const sortedLessons = recommendedLessons.sort((a, b) => lessonIds.indexOf(a.id) - lessonIds.indexOf(b.id));
    
    return (
        <div className="space-y-4">
          {sortedLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-muted p-2">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{lesson.title}</p>
                  <p className="text-sm text-muted-foreground">{lesson.type} - {lesson.level}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/lessons/${lesson.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
    );
}

export function LearningPath({ user }: LearningPathProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch the learning path document using the ID from the user profile
    const learningPathDocRef = useMemoFirebase(() => {
        if (!firestore || !user?.learningPathId) return null;
        return doc(firestore, `users/${user.id}/learningPaths`, user.learningPathId);
    }, [firestore, user?.id, user?.learningPathId]);

    const { data: learningPath, isLoading: isPathLoading, error: pathError } = useDoc<LearningPathType>(learningPathDocRef);

    const handleRegeneratePath = useCallback(async () => {
        if (!user || !firestore) return;

        setIsGenerating(true);
        try {
            const result = await generatePersonalizedLearningPath({
                currentBand: user.currentBand,
                targetBand: user.targetBand,
                nativeLanguage: user.nativeLanguage,
            });

            if (user.learningPathId && result.lessonIds) {
                // Update the existing document
                const pathRef = doc(firestore, `users/${user.id}/learningPaths`, user.learningPathId);
                await updateDoc(pathRef, { lessonIds: result.lessonIds });
                toast({ title: "Success", description: "Your learning path has been refreshed." });
            }
        } catch (err: any) {
            console.error("Error regenerating learning path:", err);
            toast({
                variant: "destructive",
                title: "AI Service Error",
                description: "Could not regenerate your learning path at this time.",
            });
        } finally {
            setIsGenerating(false);
        }
    }, [user, firestore, toast]);
    
     useEffect(() => {
        // Automatically generate a learning path if one doesn't exist and user has a score.
        if (!isPathLoading && !learningPath && user?.learningPathId === '' && user?.currentBand > 0 && !isGenerating) {
            handleRegeneratePath();
        }
    }, [isPathLoading, learningPath, user, isGenerating, handleRegeneratePath]);

    const renderContent = () => {
        const isLoading = isPathLoading || isGenerating;
        
        if (isLoading && !learningPath) {
            return <ShimmerSkeleton />;
        }

        if (pathError) {
            return (
                <div className="text-center text-destructive py-10">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                    <p className="font-semibold">Could not load path</p>
                    <p className="text-sm text-muted-foreground">{pathError.message}</p>
                </div>
            )
        }

        if (!user?.learningPathId && user.currentBand === 0) {
            return (
                <div className="text-center text-muted-foreground py-10">
                    <p className="mb-4">Your AI-powered learning path will appear here once you have an initial band score.</p>
                    <Button asChild>
                        <Link href="/diagnostic-test">Take Diagnostic Test</Link>
                    </Button>
                </div>
            );
        }
        
        if (learningPath?.lessonIds && learningPath.lessonIds.length > 0) {
            return <RecommendedLessons lessonIds={learningPath.lessonIds} />;
        }

        return (
            <div className="text-center text-muted-foreground py-10">
                <p>Your learning path is empty.</p>
                <Button onClick={handleRegeneratePath} disabled={isGenerating} className="mt-4">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                    Generate Path
                </Button>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Your Personalized Learning Path</CardTitle>
                        <CardDescription>AI-recommended lessons to help you reach your target band score.</CardDescription>
                    </div>
                    {user?.learningPathId && (
                        <Button onClick={handleRegeneratePath} variant="ghost" size="sm" disabled={isGenerating}>
                             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                            Refresh
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
}
