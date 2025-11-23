'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Target, BrainCircuit, Sparkles } from 'lucide-react';

const writingSections = [
    {
        title: 'Task 1 (Academic)',
        description: 'You will be presented with a graph, table, chart or diagram and asked to describe, summarise or explain the information in your own words. (Min. 150 words)'
    },
    {
        title: 'Task 1 (General)',
        description: 'You will be presented with a situation and asked to write a letter requesting information or explaining the situation. (Min. 150 words)'
    },
    {
        title: 'Task 2 (Both)',
        description: 'You will be asked to write an essay in response to a point of view, argument or problem. (Min. 250 words). Task 2 contributes more to your final writing score.'
    }
];

const scoringCriteria = [
    { name: 'Task Achievement / Response', description: 'How well you answered the question.' },
    { name: 'Coherence and Cohesion', description: 'How well your ideas are organized and linked.' },
    { name: 'Lexical Resource', description: 'Your range and accuracy of vocabulary.' },
    { name: 'Grammatical Range and Accuracy', description: 'Your range and accuracy of grammar.' },
]

const tips = [
    { icon: Sparkles, text: 'Analyze the question carefully. Make sure you understand exactly what is being asked.' },
    { icon: Sparkles, text: 'Plan your answer before you start writing. A clear structure is essential for a high score.' },
    { icon: Sparkles, text: 'Paraphrase the question in your introduction; do not copy it.' },
    { icon: Sparkles, text: 'Use a variety of sentence structures and vocabulary. Avoid repetition.' },
    { icon: Sparkles, text: 'Leave a few minutes at the end to check your work for spelling and grammar errors.' },
];

export default function WritingGuidePage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-primary">Master the Writing Test</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    From structure to vocabulary, learn what the examiners are looking for and how to deliver it.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target /> Test Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The IELTS Writing test takes 60 minutes and consists of two tasks. It's crucial to manage your time well, dedicating about 20 minutes to Task 1 and 40 minutes to Task 2.</p>
                    <div className="grid gap-4 md:grid-cols-3">
                        {writingSections.map(section => (
                            <div key={section.title} className="p-4 bg-muted/50 rounded-lg">
                                <h3 className="font-semibold">{section.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle /> Scoring Criteria</CardTitle>
                    <CardDescription>Your writing is marked on four key criteria. Our AI feedback is based on these exact points.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {scoringCriteria.map((criterion, index) => (
                        <div key={index} className="p-4 bg-muted/50 rounded-lg">
                           <h3 className="font-semibold">{criterion.name}</h3>
                           <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit /> Top Tips for a High Score</CardTitle>
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
                     <CardTitle className="text-xl">Your Pen is Your Power!</CardTitle>
                     <CardDescription>
                         Writing is a skill that improves with practice. Don't be afraid to make mistakes—that's how you learn! Each essay you write here is a step closer to your goal. We believe in you!
                     </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/writing">
                            Go to Practice <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
