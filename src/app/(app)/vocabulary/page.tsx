'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookMarked } from 'lucide-react';
import Link from 'next/link';
import type { Lesson } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

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
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-2/3" /></CardHeader>
                    <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                </Card>
            ))}
        </div>
      )}

      {!isLoading && vocabularyLessons && vocabularyLessons.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vocabularyLessons.map(lesson => (
            <Link href={`/lessons/${lesson.id}`} key={lesson.id} className="block">
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                      <BookMarked className="h-6 w-6 text-primary"/>
                      <CardTitle>{lesson.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{lesson.content_en}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
          !isLoading && <p className="text-center text-muted-foreground pt-10">No vocabulary lessons found.</p>
      )}
    </div>
  );
}
