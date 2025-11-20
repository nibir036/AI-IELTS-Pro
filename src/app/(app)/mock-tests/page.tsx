
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Speech, BookOpen, Headphones, ArrowRight } from 'lucide-react';

const practiceSections = [
  {
    title: 'Writing Practice',
    description: 'Hone your essay skills with official-style practice tests for Task 1 and Task 2.',
    icon: FileText,
    href: '/writing',
  },
  {
    title: 'Speaking Practice',
    description: 'Practice your responses for all three parts of the speaking test and get instant AI feedback.',
    icon: Speech,
    href: '/speaking',
  },
  {
    title: 'Reading Practice',
    description: 'Sharpen your reading comprehension with a variety of academic and general interest texts.',
    icon: BookOpen,
    href: '/reading',
  },
  {
    title: 'Listening Practice',
    description: 'Improve your listening skills with authentic audio recordings and comprehension questions.',
    icon: Headphones,
    href: '/listening',
  },
];

export default function MockTestsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Practice Tests</h1>
                <p className="text-muted-foreground">Select a skill to start your practice session. Full, timed mock tests are coming soon!</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                {practiceSections.map((section) => (
                    <Card key={section.title} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    <section.icon className="h-6 w-6 text-primary"/>
                                    {section.title}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <CardDescription>{section.description}</CardDescription>
                        </CardContent>
                        <CardFooter>
                             <Button asChild className="w-full">
                                <Link href={section.href}>
                                    Go to Practice <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
