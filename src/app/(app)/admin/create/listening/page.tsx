
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { processContent } from '@/ai/flows/content-factory-flow';

const questionSchema = z.object({
    id: z.string(),
    question: z.string().min(1, "Question text is required."),
    type: z.enum(['multiple-choice', 'fill-in-the-blank']),
    options: z.array(z.string()).optional(),
    answer: z.string().min(1, "Answer is required."),
});

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  transcript: z.string().min(50, "Transcript must be at least 50 characters long."),
  questions: z.array(questionSchema).min(1, "At least one question is required."),
});

export default function CreateListeningTestPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            transcript: '',
            questions: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const rawText = `Title: ${values.title}\nTranscript: ${values.transcript}\nQuestions: ${JSON.stringify(values.questions)}`;

            const result = await processContent({
                contentType: 'ListeningTest',
                rawText: rawText,
            });

            if ('skill' in result && result.skill === 'Listening') {
                 await setDoc(doc(firestore, 'listeningTests', result.id), result);
                 toast({
                    title: 'Success!',
                    description: `Listening test "${result.title}" has been created.`,
                });
                router.push('/listening');
            } else {
                throw new Error("AI did not return a valid ListeningTest object.");
            }

        } catch (error) {
            console.error('Error creating listening test:', error);
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create the listening test. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Listening Test</h1>
                <p className="text-muted-foreground">
                Build a listening test with a full transcript and questions. The AI will generate the audio file for you.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader><CardTitle>Test Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Title</FormLabel>
                                    <FormControl><Input placeholder="e.g., Conversation about University Life" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="transcript"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Audio Transcript</FormLabel>
                                    <FormControl><Textarea placeholder="Paste the full audio transcript here..." {...field} className="min-h-[200px]" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Questions</CardTitle>
                            <CardDescription>Add questions for the test. The IDs will be generated automatically.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                    <h4 className="font-semibold">Question {index + 1}</h4>
                                     <FormField
                                        control={form.control}
                                        name={`questions.${index}.question`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Question Text</FormLabel>
                                            <FormControl><Input placeholder="Enter the question" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField
                                            control={form.control}
                                            name={`questions.${index}.type`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Question Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                                    <SelectItem value="fill-in-the-blank">Fill-in-the-blank</SelectItem>
                                                </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`questions.${index}.answer`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Correct Answer</FormLabel>
                                                <FormControl><Input placeholder="Enter the correct answer" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button
                                type="button"
                                variant="outline"
                                onClick={() => append({ id: `q${fields.length + 1}`, question: '', type: 'multiple-choice', options: [], answer: '' })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Question
                            </Button>
                        </CardContent>
                    </Card>
                    

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Audio & Create Test
                    </Button>
                </form>
            </Form>
        </div>
    )
}
