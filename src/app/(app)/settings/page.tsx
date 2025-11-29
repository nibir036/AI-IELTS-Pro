'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { languages } from '@/lib/languages';

const settingsSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }).max(50),
  nativeLanguage: z.string(),
  targetBand: z.number().min(4.0).max(9.0),
});

export default function SettingsPage() {
  const { user, isLoading: isUserLoading, error } = useUserProfile();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: '',
      nativeLanguage: 'English',
      targetBand: 7.5,
    },
  });

  const { setValue, watch } = form;
  const targetBandValue = watch('targetBand');

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        nativeLanguage: user.nativeLanguage || 'English',
        targetBand: user.targetBand || 7.5,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', user.id);
      await updateDoc(userRef, {
        displayName: values.displayName,
        nativeLanguage: values.nativeLanguage,
        targetBand: values.targetBand,
      });
      toast({ title: 'Success!', description: 'Your settings have been updated.' });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update your settings. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and personalization settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Update your personal information and learning goals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormDescription>This is your public display name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nativeLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Native Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your native language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>This helps us tailor translations and tips for you.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetBand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Band Score: <span className="font-bold text-primary">{targetBandValue.toFixed(1)}</span></FormLabel>
                    <FormControl>
                       <Slider
                          min={4.0}
                          max={9.0}
                          step={0.5}
                          value={[field.value]}
                          onValueChange={(value) => setValue('targetBand', value[0])}
                        />
                    </FormControl>
                    <FormDescription>Set the IELTS band score you are aiming for.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <Skeleton className="h-9 w-1/4" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-1/3" />
                    <Skeleton className="h-5 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-32" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                    <div className="space-y-2">
                     <Skeleton className="h-4 w-40" />
                     <Skeleton className="h-8 w-full" />
                   </div>
                   <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        </div>
    )
}
