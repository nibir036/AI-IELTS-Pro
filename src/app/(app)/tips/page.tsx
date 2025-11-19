
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { lessons as allLessons } from '@/lib/data';
import type { Lesson } from '@/lib/types';

const tipsLessons = allLessons.filter(lesson => lesson.type === 'Tips');

export default function TipsPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tips & Strategies</h1>
        <p className="text-muted-foreground">Boost your score with these expert tips and strategies.</p>
      </div>

       {tipsLessons && tipsLessons.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tipsLessons.map(lesson => (
              <Link href={`/lessons/${lesson.id}`} key={lesson.id} className="block">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                        <Lightbulb className="h-6 w-6 text-primary"/>
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
          <p className="text-center text-muted-foreground pt-10">No tips found.</p>
      )}
    </div>
  );
}
