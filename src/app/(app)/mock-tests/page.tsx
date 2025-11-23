'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Speech, BookOpen, Headphones, ArrowRight, PenSquare, BookMarked } from 'lucide-react';

const studyPlanSections = [
  {
    title: 'Grammar Lessons',
    description: 'Strengthen your grammar foundations with targeted lessons and exercises.',
    icon: PenSquare,
    href: '/grammar',
  },
  {
    title: 'Vocabulary Builder',
    description: 'Expand your lexical resource with topic-specific vocabulary lists and practice.',
    icon: BookMarked,
    href: '/vocabulary',
  },
  {
    title: 'Attempting Speaking',
    description: 'Learn about the test format, question types, and key strategies for success. Then, practice with our AI.',
    icon: Speech,
    href: '/speaking-guide',
  },
  {
    title: 'Attempting Writing',
    description: 'Understand the tasks, scoring criteria, and tips for writing high-scoring essays.',
    icon: FileText,
    href: '/writing-guide',
  },
  {
    title: 'Attempting Reading',
    description: 'Master the skills needed to tackle different question types and manage your time effectively.',
    icon: BookOpen,
    href: '/reading-guide',
  },
  {
    title: 'Attempting Listening',
    description: 'Develop your ability to understand various accents and follow conversations to catch the correct answers.',
    icon: Headphones,
    href: '/listening-guide',
  },
];

export default function StudyPlanPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Study Plan</h1>
                <p className="text-muted-foreground">Follow this structured path to prepare for every section of the IELTS test.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {studyPlanSections.map((section) => (
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
                                    Let's Go <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
