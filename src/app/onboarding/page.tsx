'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';

import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/app/auth-guard';

const onboardingSchema = z.object({
  nativeLanguage: z.string().min(2, "Please select your native language."),
  currentBand: z.coerce.number().min(1.0).max(9.0, "Please enter a valid band score (1.0-9.0)."),
  targetBand: z.coerce.number().min(1.0).max(9.0, "Please enter a valid band score (1.0-9.0)."),
}).refine(data => data.targetBand > data.currentBand, {
  message: "Target band must be higher than your current band.",
  path: ["targetBand"],
});

export default function OnboardingPage() {
  const { user, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nativeLanguage: '',
      currentBand: 5.5,
      targetBand: 7.5,
    },
  });
  
  const {formState: {isSubmitting}} = form;

  async function onSubmit(values: z.infer<typeof onboardingSchema>) {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to complete this step.",
      });
      return;
    }

    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        nativeLanguage: values.nativeLanguage,
        currentBand: values.currentBand,
        targetBand: values.targetBand,
      });

      toast({
        title: "Profile Updated!",
        description: "Your learning path is being generated.",
      });

      router.push('/dashboard');
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save your preferences. Please try again.",
      });
    }
  }

  return (
    <AuthGuard>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
            <CardHeader>
            <CardTitle>Welcome to AI IELTS Pro!</CardTitle>
            <CardDescription>Let's personalize your learning experience. Tell us a bit about yourself.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="nativeLanguage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>What is your native language?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select your language" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="Mandarin">Mandarin</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Arabic">Arabic</SelectItem>
                            <SelectItem value="Portuguese">Portuguese</SelectItem>
                            <SelectItem value="Russian">Russian</SelectItem>
                            <SelectItem value="Japanese">Japanese</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="currentBand"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Current Band Score (or estimate)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.5" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="targetBand"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target Band Score</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.5" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save and Go to Dashboard
                </Button>
                </form>
            </Form>
            </CardContent>
        </Card>
        </div>
    </AuthGuard>
  );
}
