
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ReadingTest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function ReadingTestSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function ReadingPage() {
  const { firestore } = useFirebase();

  const testsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'readingTests');
  }, [firestore]);

  const { data: readingTests, isLoading } = useCollection<ReadingTest>(testsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reading Practice</h1>
        <p className="text-muted-foreground">Sharpen your reading comprehension with a variety of texts.</p>
      </div>

      {isLoading && (
         <div className="grid gap-6 md:grid-cols-2">
            <ReadingTestSkeleton />
            <ReadingTestSkeleton />
         </div>
      )}

      {!isLoading && readingTests && readingTests.length > 0 && (
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
      )}

      {!isLoading && (!readingTests || readingTests.length === 0) && (
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

    
