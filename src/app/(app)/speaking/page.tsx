
'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Lesson } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SpeakingPromptCard } from '@/components/app/speaking/speaking-prompt-card';

function PromptSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export default function SpeakingPage() {
  const { firestore } = useFirebase();

  const promptsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We fetch lessons of type 'Speaking' which will serve as prompts
    return query(collection(firestore, 'lessons'), where('type', '==', 'Speaking'));
  }, [firestore]);

  const { data: speakingPrompts, isLoading } = useCollection<Lesson>(promptsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Speaking Practice</h1>
        <p className="text-muted-foreground">
          Choose a prompt, practice your response, and get instant AI-powered feedback.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <PromptSkeleton />
          <PromptSkeleton />
        </div>
      )}

      {!isLoading && speakingPrompts && (
        <div className="space-y-4">
          {speakingPrompts.map(prompt => (
            <SpeakingPromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}

      {!isLoading && !speakingPrompts?.length && (
        <p className="text-center text-muted-foreground pt-10">No speaking prompts found.</p>
      )}
    </div>
  );
}
