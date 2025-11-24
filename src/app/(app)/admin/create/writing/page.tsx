
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  testType: z.enum(['IELTS-Academic', 'IELTS-General', 'PTE']),
  task1Topic: z.string().min(10, "Task 1 topic is required."),
  task2Topic: z.string().min(10, "Task 2 topic is required."),
});

export default function CreateWritingTestPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            task1Topic: '',
            task2Topic: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Firestore is not available.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const testId = `IELTS_Writing_${uuidv4().slice(0, 4)}`;
            const newTest = {
                id: testId,
                testType: values.testType,
                skill: 'Writing',
                questions: [
                    // For now, let's assume both tasks are part of the test.
                    // A more complex form could distinguish between them.
                    {
                        task: 1,
                        topic: values.task1Topic,
                        taskType: 'Task 1',
                        wordCountTarget: 150,
                    },
                    {
                        task: 2,
                        topic: values.task2Topic,
                        taskType: 'Task 2',
                        wordCountTarget: 250,
                    }
                ]
            };

            await setDoc(doc(firestore, 'mockTests', testId), newTest);

            toast({
                title: 'Success!',
                description: `Writing test "${testId}" has been created.`,
            });
            router.push('/writing');
        } catch (error) {
            console.error('Error creating writing test:', error);
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create the writing test. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Writing Test</h1>
                <p className="text-muted-foreground">
                Manually build a new Writing test with prompts for Task 1 and Task 2.
                </p>
            </div>
            <Card className="mt-6">
                 <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormField
                                control={form.control}
                                name="testType"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select a test type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="IELTS-Academic">IELTS-Academic</SelectItem>
                                        <SelectItem value="IELTS-General">IELTS-General</SelectItem>
                                        <SelectItem value="PTE">PTE</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="task1Topic"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task 1 Topic</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the chart/graph/process or write the letter topic..." {...field} className="min-h-[150px]" />
                                    </FormControl>
                                     <FormDescription>Minimum 150 words.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="task2Topic"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task 2 Topic</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter the essay prompt for Task 2..." {...field} className="min-h-[150px]" />
                                    </FormControl>
                                    <FormDescription>Minimum 250 words.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Writing Test
                            </Button>
                        </form>
                    </Form>
                 </CardContent>
            </Card>
        </div>
    )
}
