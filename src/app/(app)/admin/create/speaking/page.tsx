
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
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
            part1: '',
            part2: '',
            part3: '',
        },
    });

    const createSpeakingTest = async (title: string, content: string, level: "Part 1" | "Part 2" | "Part 3") => {
        if (!firestore) throw new Error("Firestore not initialized");
        const id = `SPEAKING_${uuidv4().slice(0, 8)}`;
        const test = {
            id,
            title,
            content_en: content,
            skill: 'Speaking' as const,
            level,
        };
        await setDoc(doc(firestore, 'speakingTests', id), test);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await createSpeakingTest('Speaking Task (Part 1)', values.part1, 'Part 1');
            await createSpeakingTest('Speaking Task (Part 2)', values.part2, 'Part 2');
            await createSpeakingTest('Speaking Task (Part 3)', values.part3, 'Part 3');
            
            toast({
                title: 'Success!',
                description: 'New speaking prompts have been created.',
            });
            router.push('/speaking');
        } catch (error) {
            console.error('Error creating speaking prompts:', error);
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: 'Could not create speaking prompts. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Speaking Test</h1>
                <p className="text-muted-foreground">
                Manually build a new Speaking test with prompts for all three parts. Each part will be saved as a separate practice card.
                </p>
            </div>
            <Card className="mt-6">
                 <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <FormField
                                control={form.control}
                                name="part1"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part 1: Introduction & Interview</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter general questions about familiar topics like home, family, work, studies and interests. Separate questions with a new line." {...field} className="min-h-[150px]" />
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
                                        <Textarea placeholder="Describe the topic card for the long turn. For example: 'Describe a memorable holiday you have had. You should say: where you went, who you were with...'" {...field} className="min-h-[150px]" />
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
                                        <Textarea placeholder="Enter discussion questions related to the Part 2 topic. These should be more abstract. Separate questions with a new line." {...field} className="min-h-[150px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Speaking Prompts
                            </Button>
                        </form>
                    </Form>
                 </CardContent>
            </Card>
        </div>
    )
}
