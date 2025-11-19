
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lessons } from '@/lib/data';
import { BookMarked } from 'lucide-react';
import Link from 'next/link';

export default function VocabularyPage() {
  const vocabularyLessons = lessons.filter(lesson => lesson.type === 'Vocabulary');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Builder</h1>
        <p className="text-muted-foreground">Expand your lexical resource with these targeted lessons.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vocabularyLessons.map(lesson => (
          <Link href="#" key={lesson.lessonId} className="block">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <BookMarked className="h-6 w-6 text-primary"/>
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
