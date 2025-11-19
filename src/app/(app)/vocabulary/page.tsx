
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookMarked, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Lesson } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


function LessonSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardContent>
    </Card>
  );
}

export default function VocabularyPage() {
  const { firestore } = useFirebase();

  const lessonsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'lessons'), where('type', '==', 'Vocabulary'));
  }, [firestore]);

  const { data: vocabularyLessons, isLoading } = useCollection<Lesson>(lessonsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Builder</h1>
        <p className="text-muted-foreground">Expand your lexical resource with these targeted lessons.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LessonSkeleton />
            <LessonSkeleton />
            <LessonSkeleton />
        </div>
      )}

      {!isLoading && vocabularyLessons && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vocabularyLessons.map(lesson => (
            <Link href={`/lessons/${lesson.lessonId}`} key={lesson.lessonId} className="block">
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                      <BookMarked className="h-6 w-6 text-primary"/>
                      <CardTitle>{lesson.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{lesson.content_en.substring(0, 100)}...</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !vocabularyLessons?.length && (
          <p className="text-center text-muted-foreground">No vocabulary lessons found.</p>
      )}
    </div>
  );
}
