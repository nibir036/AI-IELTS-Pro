'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Target, BrainCircuit, Sparkles, Ear } from 'lucide-react';

const listeningInfo = {
    overview: "The IELTS Listening test is about 30 minutes long, with an extra 10 minutes at the end to transfer your answers to the answer sheet. It consists of four recordings of native English speakers.",
    recordings: [
        'Recording 1: A conversation between two people set in an everyday social context.',
        'Recording 2: A monologue set in an everyday social context, e.g. a speech about local facilities.',
        'Recording 3: A conversation between up to four people set in an educational or training context.',
        'Recording 4: A monologue on an academic subject, e.g. a university lecture.',
    ]
};

const tips = [
    { icon: Sparkles, text: 'You only hear the audio once. It is essential to concentrate.' },
    { icon: Ear, text: 'Use the time before each section to read the questions carefully and predict the topic.' },
    { icon: Sparkles, text: 'Listen for keywords and synonyms from the questions in the recording.' },
    { icon: Sparkles, text: 'Don\'t worry if you miss a question. Leave it and focus on the next one.' },
    { icon: Sparkles, text: 'Pay attention to word count limits, for example, "NO MORE THAN TWO WORDS".' },
];

export default function ListeningGuidePage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-primary">Excel in the Listening Test</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Train your ear to catch key details and understand different accents with our proven strategies.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target /> Test Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>{listeningInfo.overview}</p>
                     <div className="space-y-2">
                        {listeningInfo.recordings.map((rec, index) => (
                             <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground border-l-2 border-primary">
                                <span className="font-semibold text-foreground">Part {index+1}:</span> {rec.replace(`Recording ${index+1}: `, '')}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit /> Top Tips for Success</CardTitle>
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
                     <CardTitle className="text-xl">Listen Closely, Answer Confidently</CardTitle>
                     <CardDescription>
                         The listening test is about focus and prediction. Every time you practice, your ability to anticipate answers and understand native speech gets stronger. You are tuning your ear for success!
                     </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/listening">
                            Go to Practice <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
