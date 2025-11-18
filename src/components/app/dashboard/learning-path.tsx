import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { lessons } from '@/lib/data';
import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';

export function LearningPath() {
    const recommendedLessons = lessons.slice(0, 3);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personalized Learning Path</CardTitle>
        <CardDescription>Recommended lessons to help you reach your target band score.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {recommendedLessons.map((lesson) => (
                <div key={lesson.lessonId} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-4">
                        <div className="rounded-md bg-muted p-2">
                           <BookOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium">{lesson.title}</p>
                            <p className="text-sm text-muted-foreground">{lesson.type} - {lesson.level}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/${lesson.type.toLowerCase()}`}>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
