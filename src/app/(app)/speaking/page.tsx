'use client';

import { SpeakingEvaluation } from '@/components/app/speaking/speaking-evaluation';
import { mockTests } from '@/lib/data';

export default function SpeakingPage() {
  const speakingTask = "Describe a memorable journey you have taken. You should say: where you went, who you traveled with, what you did there, and explain why this journey was so memorable for you.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Speaking Practice</h1>
        <p className="text-muted-foreground">
          Practice your speaking skills and get instant AI-powered feedback.
        </p>
      </div>
      <SpeakingEvaluation task={speakingTask} />
    </div>
  );
}
