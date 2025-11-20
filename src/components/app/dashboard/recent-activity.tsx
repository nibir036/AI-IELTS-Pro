'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function RecentActivity() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'submissions'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<Submission>(submissionsQuery);

  const handleRowClick = (submission: Submission) => {
    // Reading and Listening submissions don't have detailed AI reports to view
    if (submission.skill === 'Reading' || submission.skill === 'Listening') {
      return;
    }
    router.push(`/submissions/${submission.id}`);
  };
  
  const getRowClass = (submission: Submission) => {
     if (submission.skill === 'Reading' || submission.skill === 'Listening') {
      return 'cursor-default';
    }
    return 'cursor-pointer';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>An overview of your latest practice submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}
        {!isLoading && (!submissions || submissions.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet. Complete a practice session to see your results here!</p>
        )}
        {submissions && submissions.length > 0 && (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map((submission) => (
                        <TableRow key={submission.id} onClick={() => handleRowClick(submission)} className={getRowClass(submission)}>
                            <TableCell className="font-medium">{submission.skill}</TableCell>
                            <TableCell>
                                {submission.scoreBand != null && (
                                    <Badge variant={submission.scoreBand >= 7.0 ? 'default' : 'secondary'}>
                                        {submission.scoreBand.toFixed(1)}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {submission.timestamp ? formatDistanceToNow(new Date((submission.timestamp as any).seconds * 1000), { addSuffix: true }) : ''}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}
