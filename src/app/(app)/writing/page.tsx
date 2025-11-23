
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MockTest, WritingQuestion } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function WritingPage() {
  const { firestore } = useFirebase();

  const testsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
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
            {[...Array(2)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}

      {!isLoading && writingTests && writingTests.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
            {writingTests.map(test => {
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
      ) : (
         !isLoading && <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
            <CardHeader>
                <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">No Writing Tests Found</CardTitle>
                <CardDescription>
                    We are currently preparing writing practice tests. Please check back soon!
                </CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
