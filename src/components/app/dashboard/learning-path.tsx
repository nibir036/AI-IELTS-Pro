
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import type { Lesson, User, LearningPath as LearningPathType } from '@/lib/types';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { lessons as allLessons } from '@/lib/data';

interface LearningPathProps {
  user: User;
}

export function LearningPath({ user }: LearningPathProps) {
  const { firestore } = useFirebase();
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const learningPathRef = useMemoFirebase(() => {
      if (!firestore || !user?.learningPathId || typeof user.learningPathId !== 'string') return null;
      return doc(firestore, 'users', user.id, 'learningPaths', user.learningPathId);
  }, [firestore, user?.id, user?.learningPathId]);

  const { data: learningPath, isLoading: isPathLoading } = useDoc<LearningPathType>(learningPathRef);

  useEffect(() => {
    function filterLessons() {
      if (!learningPath || !learningPath.lessonIds) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      // We only need the first 3 lessons for the dashboard preview.
      const lessonIdsToFetch = learningPath.lessonIds.slice(0, 3);

      if (lessonIdsToFetch.length > 0) {
        try {
          const fetchedLessons = allLessons.filter(lesson => lessonIdsToFetch.includes(lesson.id));
          setRecommendedLessons(fetchedLessons);
        } catch (error) {
          console.error("Error filtering lessons for learning path:", error);
          setRecommendedLessons([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setRecommendedLessons([]);
        setIsLoading(false);
      }
    }

    if (!isPathLoading) {
      filterLessons();
    }
  }, [learningPath, isPathLoading]);

  const finalLoadingState = isLoading || isPathLoading;

  if (!user?.learningPathId && !finalLoadingState) {
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
        {finalLoadingState ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
          <div className="space-y-4">
            {recommendedLessons.length > 0 ? recommendedLessons.map((lesson) => (
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
            )) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>Your learning path is empty. Explore lessons on your own!</p>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
