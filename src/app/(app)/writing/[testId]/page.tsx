
'use client';

import { use } from 'react';
import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { notFound } from "next/navigation";
import { mockTests } from '@/lib/data';
import type { MockTest, WritingQuestion } from '@/lib/types';

export default function WritingTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    
    const { testId } = use(params);
    const test = mockTests.find(t => t.id === testId);

    if (!test || !test.questions || test.questions.length === 0) {
        notFound();
    }

    const task = test.questions[0] as WritingQuestion;

    return (
        <div>
            <WritingEvaluation task={task} testId={testId} />
        </div>
    );
}

    