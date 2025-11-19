
import { lessons } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function LessonPage({ params }: { params: { lessonId: string } }) {
    const lesson = lessons.find(l => l.lessonId === params.lessonId);

    if (!lesson) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                             <Badge variant="secondary" className="mb-2">{lesson.type}</Badge>
                            <CardTitle className="text-3xl">{lesson.title}</CardTitle>
                            <CardDescription>Level: {lesson.level}</CardDescription>
                        </div>
                         <div className="rounded-md bg-muted p-3">
                           <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none text-base text-foreground/80">
                        {lesson.content_en}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function generateStaticParams() {
    return lessons.map(lesson => ({
        lessonId: lesson.lessonId,
    }));
}
