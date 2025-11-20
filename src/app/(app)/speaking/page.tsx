
'use client';

import type { Lesson } from '@/lib/types';
import { SpeakingPromptCard } from '@/components/app/speaking/speaking-prompt-card';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function SpeakingPage() {
  const { firestore } = useFirebase();

  const promptsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
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
        !isLoading && <p className="text-center text-muted-foreground pt-10">No speaking prompts found.</p>
      )}
    </div>
  );
}
