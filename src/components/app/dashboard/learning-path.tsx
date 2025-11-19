
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { generatePersonalizedLearningPath } from '@/ai/flows/personalized-learning-path';
import type { Lesson, User } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface LearningPathProps {
  user: User;
}

export function LearningPath({ user }: LearningPathProps) {
  const { firestore } = useFirebase();
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLearningPath() {
      if (!user || !firestore) return;

      setIsLoading(true);
      try {
        if (user.currentBand === 0) {
            // User hasn't taken diagnostic, don't generate a path
            setRecommendedLessons([]);
            setIsLoading(false);
            return;
        }

        const input = {
          currentBand: user.currentBand,
          targetBand: user.targetBand,
          nativeLanguage: user.nativeLanguage,
        };
        
        const result = await generatePersonalizedLearningPath(input);

        if (result.lessonIds && result.lessonIds.length > 0) {
            const lessonsRef = collection(firestore, 'lessons');
            // Firestore 'in' queries are limited to 30 elements.
            // We chunk the array to handle more than 30 IDs if necessary.
            const lessonChunks: string[][] = [];
            for (let i = 0; i < result.lessonIds.length; i += 30) {
                lessonChunks.push(result.lessonIds.slice(i, i + 30));
            }
            
            const fetchedLessons: Lesson[] = [];
            for (const chunk of lessonChunks) {
                 if(chunk.length === 0) continue;
                 const q = query(lessonsRef, where('lessonId', 'in', chunk));
                 const querySnapshot = await getDocs(q);
                 querySnapshot.forEach(doc => {
                    fetchedLessons.push(doc.data() as Lesson);
                 });
            }

            // We'll show up to 3 recommended lessons on the dashboard
            setRecommendedLessons(fetchedLessons.slice(0, 3));
        } else {
            // Handle case where AI returns no lesson IDs
            setRecommendedLessons([]);
        }

      } catch (error) {
        console.error("Error generating learning path:", error);
        // As a fallback, show some generic lessons if the AI fails
        const lessonsRef = collection(firestore, 'lessons');
        const fallbackQuery = query(lessonsRef, where('level', '==', 'Intermediate'));
        const querySnapshot = await getDocs(fallbackQuery);
        const fallbackLessons = querySnapshot.docs.map(doc => doc.data() as Lesson);
        setRecommendedLessons(fallbackLessons.slice(0, 3));
      } finally {
        setIsLoading(false);
      }
    }

    fetchLearningPath();
  }, [user, firestore]);

  if (user.currentBand === 0 && !isLoading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Your Personalized Learning Path</CardTitle>
                <CardDescription>Complete your diagnostic test to get started!</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-10">
                    <p className="mb-4">Your AI-powered learning path will appear here once you have an initial band score.</p>
                    <Button asChild>
                        <Link href="/diagnostic-test">Take Diagnostic Test</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personalized Learning Path</CardTitle>
        <CardDescription>AI-recommended lessons to help you reach your target band score.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
          <div className="space-y-4">
            {recommendedLessons.length > 0 ? recommendedLessons.map((lesson) => (
                <div key={lesson.lessonId} className="flex items-center justify-between rounded-lg border p-3">
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
                        <Link href={`/lessons/${lesson.lessonId}`}>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            )) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>No recommendations right now. Explore lessons on your own!</p>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
