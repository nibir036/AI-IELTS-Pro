import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { recentSubmissions } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>An overview of your latest practice submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {recentSubmissions.map((submission) => (
                    <TableRow key={submission.submissionId}>
                        <TableCell className="font-medium">{submission.skill}</TableCell>
                        <TableCell>
                            <Badge variant={submission.scoreBand && submission.scoreBand >= 7.0 ? 'default' : 'secondary'}>
                                {submission.scoreBand ? submission.scoreBand.toFixed(1) : 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(submission.timestamp, { addSuffix: true })}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
