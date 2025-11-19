'use client';

import { useMemo } from 'react';
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2 } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Lesson } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function LessonPageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                             <Skeleton className="h-6 w-24 mb-2" />
                            <Skeleton className="h-9 w-3/4" />
                            <Skeleton className="h-5 w-1/2 mt-2" />
                        </div>
                         <div className="rounded-md bg-muted p-3">
                           <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-5 w-full mt-4" />
                    <Skeleton className="h-5 w-5/6" />
                </CardContent>
            </Card>
        </div>
    );
}


export default function LessonPage({ params }: { params: { lessonId: string } }) {
    const { firestore } = useFirebase();

    const lessonQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'lessons'), where('id', '==', params.lessonId), limit(1));
    }, [firestore, params.lessonId]);

    const { data: lessons, isLoading } = useCollection<Lesson>(lessonQuery);
    
    const lesson = lessons?.[0];

    if (isLoading) {
        return <LessonPageSkeleton />;
    }

    if (!isLoading && !lesson) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                             <Badge variant="secondary" className="mb-2">{lesson.type}</Badge>
                            <CardTitle className="text-3xl">{lesson.title}</CardTitle>
                            <CardDescription>Level: {lesson.level}</CardDescription>
                        </div>
                         <div className="rounded-md bg-muted p-3">
                           <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none text-base text-foreground/80">
                        {lesson.content_en}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// generateStaticParams is not suitable for dynamic data from firestore.
// Next.js will dynamically render pages for lesson Ids not generated at build time.


    
