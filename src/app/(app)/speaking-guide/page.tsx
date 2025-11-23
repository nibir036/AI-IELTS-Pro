'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Target, BrainCircuit, Sparkles } from 'lucide-react';

const speakingSections = [
    {
        title: 'Part 1: Introduction & Interview',
        description: 'You\'ll answer general questions about yourself, your home, family, work, studies, and interests. This part lasts for 4-5 minutes.'
    },
    {
        title: 'Part 2: The "Long Turn"',
        description: 'You\'ll be given a topic card and will have 1 minute to prepare. You then need to speak about the topic for 1-2 minutes.'
    },
    {
        title: 'Part 3: Discussion',
        description: 'The examiner will ask you further questions connected to the topic in Part 2. This part allows you to discuss more abstract issues and ideas.'
    }
];

const tips = [
    { icon: Sparkles, text: 'Don\'t give short, "yes/no" answers. Extend your responses with reasons and examples.' },
    { icon: Sparkles, text: 'Speak fluently and spontaneously. It\'s okay to make mistakes or correct yourself.' },
    { icon: Sparkles, text: 'Use a range of vocabulary and grammatical structures. Paraphrase the question where possible.' },
    { icon: Sparkles, text: 'Your accent is not a problem. Focus on clear pronunciation and intonation.' },
];

export default function SpeakingGuidePage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-primary">Master the Speaking Test</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Understand the structure, learn the strategies, and build the confidence to achieve a high score.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target /> Test Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The IELTS Speaking test is a face-to-face conversation with a certified examiner. It is designed to assess your ability to communicate effectively in English. The test is 11-14 minutes long and consists of three parts.</p>
                    <div className="grid gap-4 md:grid-cols-3">
                        {speakingSections.map(section => (
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
                    <CardTitle className="flex items-center gap-2"><BrainCircuit /> Key Strategies & Tips</CardTitle>
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
                     <CardTitle className="text-xl">You've Got This!</CardTitle>
                     <CardDescription>
                         The examiner wants to have a conversation with you, not catch you out. Relax, be yourself, and show them what you can do. Every practice session you complete here builds your fluency and confidence. You are capable of amazing things!
                     </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/speaking">
                            Go to Practice <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
