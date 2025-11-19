
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lessons } from '@/lib/data';
import { PenSquare } from 'lucide-react';
import Link from 'next/link';

export default function GrammarPage() {
  const grammarLessons = lessons.filter(lesson => lesson.type === 'Grammar');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grammar Practice</h1>
        <p className="text-muted-foreground">Strengthen your grammar foundations with these lessons.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {grammarLessons.map(lesson => (
          <Link href="#" key={lesson.lessonId} className="block">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <PenSquare className="h-6 w-6 text-primary"/>
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
