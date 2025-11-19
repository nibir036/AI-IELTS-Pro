'use client';
import { StatsCards } from '@/components/app/dashboard/stats-cards';
import { LearningPath } from '@/components/app/dashboard/learning-path';
import { RecentActivity } from '@/components/app/dashboard/recent-activity';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { user, isLoading } = useUserProfile();

    if (isLoading || !user) {
        return <DashboardSkeleton />;
    }

    const progress = user.currentBand > 0 ? (user.currentBand / user.targetBand) * 100 : 0;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || 'friend'}!</h1>
            <p className="text-muted-foreground">Here's your progress overview. Keep up the great work!</p>
            
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
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span>Current: {user.currentBand.toFixed(1)}</span>
                                <span className="font-bold text-primary">Target: {user.targetBand.toFixed(1)}</span>
                            </div>
                            <Progress value={progress} />
                            { user.currentBand > 0 && <p className="text-center text-xs text-muted-foreground mt-2">{progress.toFixed(0)}% to your goal</p> }
                        </CardContent>
                    </Card>
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
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                             <Skeleton className="h-5 w-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
