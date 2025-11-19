
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lessons } from '@/lib/data';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function TipsPage() {
  const tipsLessons = lessons.filter(lesson => lesson.type === 'Tips');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tips & Strategies</h1>
        <p className="text-muted-foreground">Boost your score with these expert tips and strategies.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tipsLessons.map(lesson => (
          <Link href={`/lessons/${lesson.lessonId}`} key={lesson.lessonId} className="block">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <Lightbulb className="h-6 w-6 text-primary"/>
                    <CardTitle>{lesson.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{lesson.content_en.substring(0, 100)}...</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
