'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { generatePersonalizedLearningPath } from '@/ai/flows/personalized-learning-path';
import type { Lesson, User } from '@/lib/types';
import { lessons as allLessons } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';


interface LearningPathProps {
  user: User;
}

export function LearningPath({ user }: LearningPathProps) {
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLearningPath = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const input = {
        currentBand: user.currentBand,
        targetBand: user.targetBand,
        nativeLanguage: user.nativeLanguage,
      };
      
      const result = await generatePersonalizedLearningPath(input);

      if (result.lessonIds && result.lessonIds.length > 0) {
          const lessonIdsToFetch = result.lessonIds.slice(0, 3);
          const fetchedLessons = allLessons.filter(lesson => lessonIdsToFetch.includes(lesson.id));
          
          // Ensure the order matches the AI's recommendation
          fetchedLessons.sort((a, b) => lessonIdsToFetch.indexOf(a.id) - lessonIdsToFetch.indexOf(b.id));

          setRecommendedLessons(fetchedLessons);
      } else {
          setRecommendedLessons([]);
      }
    } catch (err: any) {
      console.error("Error generating learning path:", err);
      setError("The AI service is currently unavailable. Please try again in a moment.");
      toast({
        variant: "destructive",
        title: "AI Service Error",
        description: "Could not generate your learning path at this time.",
      })
      setRecommendedLessons([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if(user.learningPathId || user.currentBand > 0) {
      fetchLearningPath();
    } else {
        setIsLoading(false);
    }
  }, [fetchLearningPath, user]);
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
        return (
             <div className="text-center text-destructive py-10">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                <p className="font-semibold">Could not generate path</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchLearningPath} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Try Again
                </Button>
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
      )
  }

    if (recommendedLessons.length > 0) {
      return (
        <div className="space-y-4">
          {recommendedLessons.map((lesson) => (
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
    
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>Your learning path is empty. Explore lessons on your own!</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personalized Learning Path</CardTitle>
        <CardDescription>AI-recommended lessons to help you reach your target band score.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
