'use client';

import type { AiPoweredWritingEvaluationOutput } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, CheckCircle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface WritingEvaluationResultsProps {
    result: AiPoweredWritingEvaluationOutput;
    title?: string;
}

export function WritingEvaluationResults({ result, title = "Here's Your Analysis!" }: WritingEvaluationResultsProps) {
    return (
        <Card className="animate-in fade-in-50 duration-500">
            <CardHeader>
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Pencil className="text-primary" /> {title}
                        </CardTitle>
                        <CardDescription>Every essay you write is a step towards success. Keep up the great work!</CardDescription>
                    </div>
                    <div className="text-center w-full sm:w-auto rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Overall Band</p>
                        <p className="text-4xl font-bold text-primary">{result.overallBand.toFixed(1)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Feedback Summary</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{result.feedbackSummary}</p>
                </div>
                <Separator />
                <div>
                    <h3 className="font-semibold mb-2">Criterion Scores</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(result.criterionScores).map(([key, score]) => (
                            <Card key={key}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{score.band.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{score.comment}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <Separator />
                <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="font-semibold">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary"/> Areas for Improvement
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {result.improvementAreas.map((area, index) => (
                                <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                                    <div className="font-medium flex items-center gap-2">
                                        <Badge variant="secondary">{area.type}</Badge> {area.rule}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{area.example}</p>
                                </div>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger className="font-semibold">
                             <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600"/> Corrected Essay
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none pt-4 text-muted-foreground whitespace-pre-wrap">
                            {result.correctedEssay}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
