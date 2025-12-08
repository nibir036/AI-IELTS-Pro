
'use client';

import { use } from 'react';
import { notFound } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MockTest } from '@/lib/types';
import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { Skeleton } from '@/components/ui/skeleton';

function TestPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-10 w-48" />
        </div>
    );
}

export default function WritingTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    const { testId } = use(params);
    const { firestore } = useFirebase();

    const testDocRef = useMemoFirebase(() => {
        if (!firestore || !testId) return null;
        return doc(firestore, 'mockTests', testId);
    }, [firestore, testId]);

    const { data: test, isLoading } = useDoc<MockTest>(testDocRef);

    if (isLoading) {
        return <TestPageSkeleton />;
    }

    if (!test || !test.questions || test.questions.length === 0) {
        notFound();
    }

    return (
        <div>
            <WritingEvaluation test={test} />
        </div>
    );
}

    