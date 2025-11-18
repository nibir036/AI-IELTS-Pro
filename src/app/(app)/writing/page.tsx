import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockTests } from '@/lib/data';
import type { WritingQuestion } from '@/lib/types';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WritingPage() {
  const writingTests = mockTests.filter(test => test.skill === 'Writing');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writing Practice</h1>
        <p className="text-muted-foreground">Hone your essay skills with official-style practice tests.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {writingTests.map(test => {
            const question = test.questions[0] as WritingQuestion;
            return (
          <Card key={test.testId} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="mb-1">{test.testType} - {question.taskType}</CardTitle>
                  <Badge variant="secondary">{test.skill}</Badge>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-3">{question.topic}</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/writing/${test.testId}`}>
                        Start Practice <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
          </Card>
        )})}
      </div>
    </div>
  );
}
