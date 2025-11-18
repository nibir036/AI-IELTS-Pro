import { mockTests } from "@/lib/data";
import { WritingQuestion } from "@/lib/types";
import { WritingEvaluation } from "@/components/app/writing/writing-evaluation";
import { notFound } from "next/navigation";

export default function WritingTaskPage({ params }: { params: { testId: string } }) {
    const test = mockTests.find(t => t.testId === params.testId);

    if (!test) {
        notFound();
    }

    const task = test.questions[0] as WritingQuestion;

    return (
        <div>
            <WritingEvaluation task={task} />
        </div>
    );
}

export function generateStaticParams() {
    return mockTests.filter(t => t.skill === 'Writing').map(test => ({
        testId: test.testId,
    }));
}
