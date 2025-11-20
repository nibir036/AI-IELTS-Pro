'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  lessons as allLessons,
  mockTests as allMockTests,
  readingTests as allReadingTests,
  listeningTests as allListeningTests,
} from '@/lib/data';
import type {
  Lesson,
  MockTest,
  ReadingTest,
  ListeningTest,
  WritingQuestion,
} from '@/lib/types';
import {
  FileText,
  Speech,
  BookOpen,
  Headphones,
  Lightbulb,
  BookMarked,
  PenSquare,
} from 'lucide-react';

const iconMap = {
  Writing: FileText,
  Speaking: Speech,
  Reading: BookOpen,
  Listening: Headphones,
  Tips: Lightbulb,
  Vocabulary: BookMarked,
  Grammar: PenSquare,
};

type SearchResult = {
  id: string;
  title: string;
  description: string;
  type: string;
  href: string;
  Icon: React.ElementType;
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchQuery, setSearchQuery] = useState(query || '');

  const searchResults: SearchResult[] = useMemo(() => {
    if (!query) return [];

    const lowerCaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search Lessons
    allLessons.forEach((lesson) => {
      if (
        lesson.title.toLowerCase().includes(lowerCaseQuery) ||
        lesson.content_en.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({
          id: `lesson-${lesson.id}`,
          title: lesson.title,
          description: lesson.content_en.substring(0, 150) + '...',
          type: lesson.type,
          href: `/lessons/${lesson.id}`,
          Icon: iconMap[lesson.type as keyof typeof iconMap] || BookOpen,
        });
      }
    });

    // Search Writing Tests
    allMockTests.forEach((test) => {
      const question = test.questions[0] as WritingQuestion;
      if (
        test.skill === 'Writing' &&
        question.topic.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({
          id: `writing-${test.id}`,
          title: `${test.testType} - ${question.taskType}`,
          description: question.topic,
          type: 'Writing Practice',
          href: `/writing/${test.id}`,
          Icon: iconMap.Writing,
        });
      }
    });

    // Search Reading Tests
    allReadingTests.forEach((test) => {
      if (
        test.title.toLowerCase().includes(lowerCaseQuery) ||
        test.passage.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({
          id: `reading-${test.id}`,
          title: test.title,
          description: test.passage.substring(0, 150) + '...',
          type: 'Reading Practice',
          href: `/reading/${test.id}`,
          Icon: iconMap.Reading,
        });
      }
    });

    // Search Listening Tests
    allListeningTests.forEach((test) => {
      if (
        test.title.toLowerCase().includes(lowerCaseQuery) ||
        (test.transcript && test.transcript.toLowerCase().includes(lowerCaseQuery))
      ) {
        results.push({
          id: `listening-${test.id}`,
          title: test.title,
          description: `A listening test with ${test.questions.length} questions.`,
          type: 'Listening Practice',
          href: `/listening/${test.id}`,
          Icon: iconMap.Listening,
        });
      }
    });

    return results;
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    setSearchQuery(query || '');
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
          <Input
            type="search"
            placeholder="Search for anything..."
            className="flex-grow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {query && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">
            Results for "{query}" ({searchResults.length} found)
          </h2>
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((result) => (
                <Link href={result.href} key={result.id} className="block">
                  <Card className="transition-all hover:shadow-md hover:border-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge variant="secondary" className="mb-2">
                            {result.type}
                          </Badge>
                          <CardTitle className="text-lg">{result.title}</CardTitle>
                        </div>
                        <result.Icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {result.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
              <CardHeader>
                <CardTitle>No Results Found</CardTitle>
                <CardDescription>
                  Try searching for a different keyword.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
       {!query && (
         <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
            <CardHeader>
              <CardTitle>Search the App</CardTitle>
              <CardDescription>
                Find lessons, practice tests, and tips to help you on your learning journey.
              </CardDescription>
            </CardHeader>
          </Card>
      )}
    </div>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={<div>Loading search...</div>}>
            <SearchPageContent />
        </Suspense>
    )
}
