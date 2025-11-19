
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { readingTests } from '@/lib/data';
import type { ReadingTest } from '@/lib/types';

export default function ReadingPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reading Practice</h1>
        <p className="text-muted-foreground">Sharpen your reading comprehension with a variety of texts.</p>
      </div>

      {readingTests && readingTests.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
            {readingTests.map(test => (
              <Card key={test.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="mb-1">{test.title}</CardTitle>
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                   <Badge variant="secondary" className="w-fit">{test.skill}</Badge>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">{test.passage}</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={`/reading/${test.id}`}>
                            Start Practice <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : (
         <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
            <CardHeader>
                <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                    <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Reading Tests Found</CardTitle>
                <CardDescription>
                    We are currently preparing reading practice tests. Please check back soon!
                </CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
