'use client';
import { use } from 'react';
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lightbulb } from "lucide-react";
import type { Lesson, ContentBlock } from '@/lib/types';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

function LessonPageSkeleton() {
    return (
         <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                             <Skeleton className="h-6 w-20" />
                             <Skeleton className="h-9 w-80" />
                             <Skeleton className="h-5 w-40" />
                        </div>
                         <Skeleton className="h-16 w-16" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-24 w-full mt-4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                </CardContent>
            </Card>
        </div>
    )
}

function RenderContentBlock({ block }: { block: ContentBlock }) {
    switch (block.type) {
        case 'explanation':
            return <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />;
        case 'example':
            return (
                <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                        <p className="font-mono text-sm italic" dangerouslySetInnerHTML={{ __html: `"${block.content}"` }} />
                    </div>
                    {block.generatedImageUrl && (
                        <div className="relative aspect-video">
                            <Image
                                src={block.generatedImageUrl}
                                alt={block.content}
                                fill
                                className="rounded-lg shadow-md object-contain"
                            />
                        </div>
                    )}
                </div>
            );
        case 'tip':
            return (
                 <div className="my-4 flex items-start gap-3 rounded-lg border bg-amber-50 p-4 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800">
                    <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                        <h4 className="font-semibold">Pro Tip</h4>
                        <p className="text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                </div>
            );
        case 'image_placeholder':
             return (
                <div className="my-6">
                    {block.generatedImageUrl && (
                        <Image
                            src={block.generatedImageUrl}
                            alt={block.content}
                            width={600}
                            height={400}
                            className="rounded-lg shadow-md mx-auto object-contain"
                        />
                    )}
                    <p className="text-center text-xs text-muted-foreground mt-2 italic" dangerouslySetInnerHTML={{ __html: block.content }} />
                </div>
            )
        default:
            return null;
    }
}


function LessonComponent({ lesson }: { lesson: Lesson }) {
     return (
        <div className="max-w-4xl mx-auto animate-in fade-in-50">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                             <Badge variant="secondary" className="mb-2">{lesson.type}</Badge>
                            <CardTitle className="text-3xl font-bold">{lesson.title}</CardTitle>
                            <CardDescription>Level: {lesson.level}</CardDescription>
                        </div>
                         <div className="rounded-md bg-muted p-3">
                           <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                     {(lesson.contentBlocks && lesson.contentBlocks.length > 0) ? (
                        lesson.contentBlocks.map((block, index) => (
                           <RenderContentBlock key={index} block={block} />
                        ))
                     ) : (
                         <p className="prose dark:prose-invert max-w-none text-base text-foreground/80" dangerouslySetInnerHTML={{ __html: lesson.content_en }} />
                     )}
                </CardContent>
            </Card>
        </div>
    );
}


export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = use(params);
    const { firestore } = useFirebase();

    const lessonDocRef = useMemoFirebase(() => {
        if (!firestore || !lessonId) return null;
        return doc(firestore, 'lessons', lessonId);
    }, [firestore, lessonId]);

    const { data: lesson, isLoading } = useDoc<Lesson>(lessonDocRef);

    if (isLoading) {
        return <LessonPageSkeleton />;
    }

    if (!lesson) {
        notFound();
    }
    
    return <LessonComponent lesson={lesson} />;
}
