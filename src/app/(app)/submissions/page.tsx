
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function SubmissionsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function SubmissionsPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'submissions'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<Submission>(submissionsQuery);

  const handleRowClick = (submissionId: string) => {
    router.push(`/submissions/${submissionId}`);
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">My Submissions</h1>
        <p className="text-muted-foreground">A complete history of all your practice sessions.</p>
      </div>

      {isLoading && <SubmissionsSkeleton />}

      {!isLoading && submissions && submissions.length > 0 && (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Skill</TableHead>
                            <TableHead>Test/Task</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.map((submission) => (
                            <TableRow key={submission.id} onClick={() => handleRowClick(submission.id)} className="cursor-pointer">
                                <TableCell className="font-medium">
                                    <Badge>{submission.skill}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{submission.testId}</TableCell>
                                <TableCell className="text-center">
                                    {submission.scoreBand != null ? (
                                        <Badge variant={submission.scoreBand >= 7.0 ? 'default' : 'secondary'}>
                                            {submission.scoreBand.toFixed(1)}
                                        </Badge>
                                    ) : <Badge variant="outline">N/A</Badge>}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {submission.timestamp ? formatDistanceToNow(new Date((submission.timestamp as any).seconds * 1000), { addSuffix: true }) : ''}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

       {!isLoading && (!submissions || submissions.length === 0) && (
        <Card className="text-center py-12 border-dashed">
            <CardHeader>
                <CardTitle>No Submissions Yet</CardTitle>
                <CardDescription>
                    Your practice history will appear here once you complete a test.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/mock-tests">
                        Start Practicing <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
