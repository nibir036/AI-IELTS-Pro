
'use client';

import type { Lesson } from '@/lib/types';
import { SpeakingPromptCard } from '@/components/app/speaking/speaking-prompt-card';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/use-user-profile';


const ADMIN_UIDS = ['yTh2178GN3ZV3mAGi3wAmdPOKlm1'];

export default function SpeakingPage() {
  const { firestore } = useFirebase();
  const { user: userProfile, isLoading: isUserLoading } = useUserProfile();

  const promptsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'lessons'), where('type', '==', 'Speaking'));
  }, [firestore]);

  const { data: speakingPrompts, isLoading: isPromptsLoading } = useCollection<Lesson>(promptsQuery);

  const isLoading = isUserLoading || isPromptsLoading;
  const isUserAdmin = userProfile ? ADMIN_UIDS.includes(userProfile.id) : false;

  const NoPromptsMessage = () => (
    <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                <Mic className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">No Speaking Prompts Found</CardTitle>
            <CardDescription>
                {isUserAdmin 
                    ? "Create new speaking prompts for users to practice with."
                    : "New speaking prompts will be available soon."
                }
            </CardDescription>
        </CardHeader>
         {isUserAdmin && (
            <CardContent>
                <Button asChild>
                    <Link href="/admin/create/speaking">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Prompt
                    </Link>
                </Button>
            </CardContent>
        )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Speaking Practice</h1>
            <p className="text-muted-foreground">
            Choose a prompt, practice your response, and get instant AI-powered feedback.
            </p>
        </div>
         {isUserAdmin && speakingPrompts && speakingPrompts.length > 0 && (
             <Button asChild>
                <Link href="/admin/create/speaking">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New
                </Link>
            </Button>
         )}
      </div>

      {isLoading && (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {!isLoading && speakingPrompts && speakingPrompts.length > 0 ? (
        <div className="space-y-4">
          {speakingPrompts.map(prompt => (
            <SpeakingPromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        !isLoading && <NoPromptsMessage />
      )}
    </div>
  );
}
