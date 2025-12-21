
'use client';

import { use } from 'react';
import { notFound } from "next/navigation";
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SpeakingTest } from '@/lib/types';
import { SpeakingEvaluation } from "@/components/app/speaking/speaking-evaluation";
import { Skeleton } from '@/components/ui/skeleton';

function TestPageSkeleton() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
            </div>
            <Skeleton className="h-[60vh] w-full" />
        </div>
    );
}

export default function SpeakingTaskPage({ params }: { params: Promise<{ testId: string }> }) {
    const { testId } = use(params);
    const { firestore } = useFirebase();

    const testDocRef = useMemoFirebase(() => {
        if (!firestore || !testId) return null;
        return doc(firestore, 'speakingTests', testId);
    }, [firestore, testId]);

    const { data: test, isLoading } = useDoc<SpeakingTest>(testDocRef);

    if (isLoading) {
        return <TestPageSkeleton />;
    }

    if (!test) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <SpeakingEvaluation test={test} />
        </div>
    );
}
