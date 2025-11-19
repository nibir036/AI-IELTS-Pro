'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { MockTest, WritingQuestion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function WritingTestSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}


export default function WritingPage() {
  const { firestore } = useFirebase();

  const testsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Query for tests where the skill is 'Writing'
    return query(collection(firestore, 'mockTests'), where('skill', '==', 'Writing'));
  }, [firestore]);

  const { data: writingTests, isLoading } = useCollection<MockTest>(testsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writing Practice</h1>
        <p className="text-muted-foreground">Hone your essay skills with official-style practice tests.</p>
      </div>

      {isLoading && (
         <div className="grid gap-6 md:grid-cols-2">
            <WritingTestSkeleton />
            <WritingTestSkeleton />
         </div>
      )}

      {!isLoading && writingTests && writingTests.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
            {writingTests.map(test => {
                // Defensive check to prevent crash
                if (!test.questions || test.questions.length === 0) {
                    return null;
                }
                const question = test.questions[0] as WritingQuestion;
                return (
              <Card key={test.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="mb-1">{test.testType} - {question.taskType}</CardTitle>
                      <Badge variant="secondary">{test.skill}</Badge>
                    </div>
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">{question.topic}</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={`/writing/${test.id}`}>
                            Start Practice <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
              </Card>
            )})}
        </div>
      )}

      {!isLoading && (!writingTests || writingTests.length === 0) && (
        <p className="text-center text-muted-foreground pt-10">No writing tests found.</p>
      )}
    </div>
  );
}
