
'use client';
import { use } from 'react';
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Languages, Loader2 } from "lucide-react";
import type { Lesson, ContentBlock, GrammarTableRow } from '@/lib/types';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getTranslation } from '@/ai/flows/multilingual-support';

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
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    )
}


function GrammarTable({ rows }: { rows: GrammarTableRow[] }) {
    if (!rows || rows.length === 0) return null;
    return (
        <div className="my-4 overflow-hidden rounded-lg border">
            <Table>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} className={index === rows.length - 1 ? "border-b-0" : ""}>
                            <TableCell className="w-[40%] font-mono text-sm text-muted-foreground">{row.subject}</TableCell>
                            <TableCell className="font-semibold" dangerouslySetInnerHTML={{ __html: row.verb }} />
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function ExampleList({ examples }: { examples: string[] }) {
    if (!examples || examples.length === 0) return null;
    return (
        <ul className="my-4 list-disc list-inside space-y-2">
            {examples.map((example, index) => (
                <li key={index} className="text-foreground/80 pl-2">
                    <span dangerouslySetInnerHTML={{ __html: example }} />
                </li>
            ))}
        </ul>
    )
}

function RenderContentBlock({ block, index, translatedContent }: { block: ContentBlock, index: number, translatedContent?: string }) {
    
    // Determine which content to display for explanations
    const displayContent = (block.type === 'explanation' && translatedContent) ? translatedContent : block.content;

    return (
        <div className="space-y-4 py-6">
             {index > 0 && <Separator />}
             {block.sectionTitle && (
                <h3 className="text-xl font-semibold tracking-tight" dangerouslySetInnerHTML={{ __html: block.sectionTitle }}/>
            )}
            
            {(block.type === 'explanation' && displayContent) && (
                 <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: displayContent }} />
            )}
            
             {block.type === 'image_placeholder' && (
                <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {block.generatedImageUrl ? (
                        <div className="relative aspect-video">
                            <Image
                                src={block.generatedImageUrl}
                                alt={block.imageHint || 'Lesson image'}
                                fill
                                className="rounded-lg shadow-md object-cover"
                            />
                        </div>
                    ) :  <Skeleton className="aspect-video w-full" />}
                     {block.content && (
                         <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                            <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
                        </div>
                    )}
                </div>
            )}
            
            {block.type === 'grammar_table' && block.tableRows && (
                <GrammarTable rows={block.tableRows} />
            )}

            {block.type === 'example_list' && block.examples && (
                <ExampleList examples={block.examples} />
            )}
            
             {block.type === 'example' && block.content && (
                <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                    <p className="font-mono text-sm italic" dangerouslySetInnerHTML={{ __html: `"${block.content}"` }} />
                </div>
            )}
        </div>
    )
}


function LessonComponent({ lesson }: { lesson: Lesson }) {
    const { user } = useUserProfile();
    const { toast } = useToast();
    const [isTranslating, setIsTranslating] = useState(false);
    const [isTranslated, setIsTranslated] = useState(false);
    const [translatedBlocks, setTranslatedBlocks] = useState<Record<number, string>>({});
    
    const canTranslate = user?.nativeLanguage && user.nativeLanguage.toLowerCase() !== 'english' && lesson.contentBlocks?.some(b => b.type === 'explanation' && b.content);

    const handleTranslateToggle = async () => {
        if (isTranslating) return;

        // If it's already translated, revert to English
        if (isTranslated) {
            setIsTranslated(false);
            return;
        }

        // If we have translations cached, just show them
        if (Object.keys(translatedBlocks).length > 0) {
            setIsTranslated(true);
            return;
        }

        // Otherwise, fetch translations
        setIsTranslating(true);
        try {
            const translationPromises = lesson.contentBlocks
                .map((block, index) => {
                    if (block.type === 'explanation' && block.content) {
                        return getTranslation({
                            text: block.content.replace(/<[^>]*>?/gm, ''), // Strip HTML tags
                            nativeLanguage: user!.nativeLanguage,
                        }).then(result => ({ index, text: result.translatedText }));
                    }
                    return null;
                })
                .filter(p => p !== null);
            
            const results = await Promise.all(translationPromises as Promise<{ index: number, text: string }>[]);
            
            const newTranslations: Record<number, string> = {};
            results.forEach(result => {
                newTranslations[result.index] = result.text;
            });
            
            setTranslatedBlocks(newTranslations);
            setIsTranslated(true);

        } catch (error) {
            console.error('Translation error:', error);
            toast({
                variant: 'destructive',
                title: 'Translation Failed',
                description: 'Could not translate the content at this time.',
            });
        } finally {
            setIsTranslating(false);
        }
    };


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
                    </div>
                </CardHeader>
                <CardContent className="divide-y">
                     {(lesson.contentBlocks && lesson.contentBlocks.length > 0) ? (
                        lesson.contentBlocks.map((block, index) => (
                           <RenderContentBlock key={index} block={block} index={index} translatedContent={isTranslated ? translatedBlocks[index] : undefined}/>
                        ))
                     ) : (
                         <p className="prose dark:prose-invert max-w-none text-base text-foreground/80 pt-4" dangerouslySetInnerHTML={{ __html: lesson.content_en }} />
                     )}
                </CardContent>
                 {canTranslate && (
                    <CardFooter>
                        <Button variant="outline" onClick={handleTranslateToggle} disabled={isTranslating}>
                             {isTranslating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : (
                                <Languages className="mr-2 h-4 w-4" />
                            )}
                            {isTranslated ? 'Show Original' : `Translate to ${user?.nativeLanguage}`}
                        </Button>
                    </CardFooter>
                )}
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
