
'use client';

import { lessons as allLessons } from '@/lib/data';
import type { Lesson } from '@/lib/types';
import { SpeakingPromptCard } from '@/components/app/speaking/speaking-prompt-card';

const speakingPrompts = allLessons.filter(lesson => lesson.type === 'Speaking');

export default function SpeakingPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Speaking Practice</h1>
        <p className="text-muted-foreground">
          Choose a prompt, practice your response, and get instant AI-powered feedback.
        </p>
      </div>

      {speakingPrompts && speakingPrompts.length > 0 ? (
        <div className="space-y-4">
          {speakingPrompts.map(prompt => (
            <SpeakingPromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground pt-10">No speaking prompts found.</p>
      )}
    </div>
  );
}
