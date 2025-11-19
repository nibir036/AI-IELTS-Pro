
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenSquare } from 'lucide-react';
import Link from 'next/link';
import { lessons as allLessons } from '@/lib/data';
import type { Lesson } from '@/lib/types';

const grammarLessons = allLessons.filter(lesson => lesson.type === 'Grammar');

export default function GrammarPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grammar Practice</h1>
        <p className="text-muted-foreground">Strengthen your grammar foundations with these lessons.</p>
      </div>

      {grammarLessons && grammarLessons.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grammarLessons.map(lesson => (
              <Link href={`/lessons/${lesson.id}`} key={lesson.id} className="block">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                        <PenSquare className="h-6 w-6 text-primary"/>
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
          <p className="text-center text-muted-foreground pt-10">No grammar lessons found.</p>
      )}
    </div>
  );
}
