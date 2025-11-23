'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Target, BrainCircuit, Sparkles, Clock } from 'lucide-react';

const readingInfo = {
    overview: "The IELTS Reading test is 60 minutes long and consists of 3 passages with a total of 40 questions. The passages are taken from books, journals, magazines, and newspapers.",
    time: "You do NOT get extra time to transfer your answers. Write them on the answer sheet as you go.",
};

const questionTypes = [
    'Multiple Choice',
    'Identifying Information (True/False/Not Given)',
    'Matching Headings',
    'Matching Features',
    'Sentence Completion',
    'Summary Completion',
];

const tips = [
    { icon: Clock, text: 'Don\'t spend too long on one question. Move on and come back if you have time.' },
    { icon: Sparkles, text: 'Skim the passage first to get a general idea of the content before reading the questions.' },
    { icon: Sparkles, text: 'Read the instructions carefully. Some questions require you to write words, others just a letter.' },
    { icon: Sparkles, text: 'The answers usually appear in the same order in the text as the questions.' },
    { icon: Sparkles, text: 'Improve your reading speed by practicing regularly with a wide range of texts.' },
];

export default function ReadingGuidePage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-primary">Conquer the Reading Test</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Develop the skills to read efficiently, understand complex texts, and find the right answers under pressure.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target /> Test Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>{readingInfo.overview}</p>
                    <div className="p-4 bg-amber-100/50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300">
                        <h3 className="font-semibold flex items-center gap-2"><Clock /> Time is critical!</h3>
                        <p className="text-sm">{readingInfo.time}</p>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Common Question Types</CardTitle>
                    <CardDescription>Familiarize yourself with the kinds of questions you'll face.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {questionTypes.map((type) => (
                       <div key={type} className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">{type}</div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit /> Essential Tips & Strategies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <tip.icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <p className="text-foreground/80">{tip.text}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-primary/10 border-primary/30">
                <CardHeader className="text-center">
                     <CardTitle className="text-xl">Read, Understand, Succeed!</CardTitle>
                     <CardDescription>
                         Every text is a new world to explore. Practice sharpens your focus and builds your speed. You are becoming a more skilled and confident reader with every passage you complete.
                     </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/reading">
                            Go to Practice <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
