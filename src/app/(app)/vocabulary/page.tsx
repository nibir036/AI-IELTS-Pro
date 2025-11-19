
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookMarked } from 'lucide-react';
import Link from 'next/link';
import { lessons as allLessons } from '@/lib/data';
import type { Lesson } from '@/lib/types';

const vocabularyLessons = allLessons.filter(lesson => lesson.type === 'Vocabulary');

export default function VocabularyPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Builder</h1>
        <p className="text-muted-foreground">Expand your lexical resource with these targeted lessons.</p>
      </div>

      {vocabularyLessons && vocabularyLessons.length > 0 ? (
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
                  <p className="text-sm text-muted-foreground">{lesson.content_en.substring(0, 100)}...</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
          <p className="text-center text-muted-foreground pt-10">No vocabulary lessons found.</p>
      )}
    </div>
  );
}
