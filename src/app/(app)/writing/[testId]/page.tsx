
'use client';

import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { notFound } from "next/navigation";
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { MockTest, WritingQuestion } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";

function WritingTaskSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2 rounded-lg border p-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-10 w-48" />
            </div>
        </div>
    )
}

export default function WritingTaskPage({ params }: { params: { testId: string } }) {
    const { firestore } = useFirebase();

    const testQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'mockTests'), where('testId', '==', params.testId), limit(1));
    }, [firestore, params.testId]);

    const { data: tests, isLoading } = useCollection<MockTest>(testQuery);

    const test = tests?.[0];

    if (isLoading) {
        return <WritingTaskSkeleton />;
    }

    if (!isLoading && !test) {
        notFound();
    }

    const task = test.questions[0] as WritingQuestion;

    return (
        <div>
            <WritingEvaluation task={task} />
        </div>
    );
}
