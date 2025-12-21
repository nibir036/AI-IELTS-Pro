
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { OpenInFirebaseButton } from '@/components/app/admin/open-in-firebase-button';

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  part1: z.string().min(10, "Part 1 prompts are required."),
  part2: z.string().min(10, "Part 2 prompt is required."),
  part3: z.string().min(10, "Part 3 prompts are required."),
});

export default function CreateSpeakingTestPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            part1: '',
            part2: '',
            part3: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        if (!firestore) {
             toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
             setIsSubmitting(false);
             return;
        }

        try {
            const testId = `SPEAKING_${uuidv4().slice(0, 8).toUpperCase()}`;
            const newTest = {
                id: testId,
                title: values.title,
                skill: 'Speaking' as const,
                part1: values.part1,
                part2: values.part2,
                part3: values.part3,
            };
            await setDoc(doc(firestore, 'speakingTests', testId), newTest);
            
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            toast({
                title: 'Success!',
                description: `Speaking test "${values.title}" created.`,
                action: projectId ? <OpenInFirebaseButton projectId={projectId} collection="speakingTests" docId={testId} /> : undefined,
            });
            
            router.push('/speaking');
        } catch (error) {
            console.error('Error creating speaking test:', error);
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create speaking test. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Full Speaking Test</h1>
                <p className="text-muted-foreground">
                Build a new, complete Speaking test with a central topic and prompts for all three parts.
                </p>
            </div>
            <Card className="mt-6">
                 <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Title / Topic</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., 'A Difficult Decision', 'Technology', 'Holidays'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="part1"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part 1: Introduction & Interview</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter general questions about familiar topics related to the main title. Separate questions with a new line." {...field} className="min-h-[150px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="part2"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part 2: Long Turn</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the topic card for the long turn. This should directly relate to the main title. For example: 'Describe a memorable holiday you have had. You should say: where you went, who you were with...'" {...field} className="min-h-[150px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="part3"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part 3: Discussion</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter abstract discussion questions that expand on the Part 2 topic. Separate questions with a new line." {...field} className="min-h-[150px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Speaking Test
                            </Button>
                        </form>
                    </Form>
                 </CardContent>
            </Card>
        </div>
    )
}
