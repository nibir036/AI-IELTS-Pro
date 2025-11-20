
'use client';
import { StatsCards } from '@/components/app/dashboard/stats-cards';
import { LearningPath } from '@/components/app/dashboard/learning-path';
import { RecentActivity } from '@/components/app/dashboard/recent-activity';
import { PredictedDateCard } from '@/components/app/dashboard/predicted-date-card';
import { ProgressChart } from '@/components/app/dashboard/progress-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
    const { user, isLoading } = useUserProfile();

    if (isLoading || !user) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in-50">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || 'friend'}!</h1>
            <p className="text-muted-foreground">Let's conquer your goals today. Here's your progress overview.</p>
            
            <StatsCards user={user} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <LearningPath user={user} />
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress to Target</CardTitle>
                        </CardHeader>
                        <CardContent>
                           { user.currentBand > 0 ? (
                               <ProgressChart currentBand={user.currentBand} targetBand={user.targetBand} />
                           ) : (
                                <div className="text-center mt-4">
                                     <p className="text-sm text-muted-foreground mb-4">Take the diagnostic test to set your initial score.</p>
                                     <Button asChild size="sm">
                                        <Link href="/diagnostic-test">Start Test</Link>
                                     </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <PredictedDateCard user={user} />
                    <RecentActivity />
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="h-5 w-3/4" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent className="flex justify-center items-center">
                            <Skeleton className="h-32 w-32 rounded-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
