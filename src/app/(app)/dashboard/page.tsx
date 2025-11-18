import { StatsCards } from '@/components/app/dashboard/stats-cards';
import { LearningPath } from '@/components/app/dashboard/learning-path';
import { RecentActivity } from '@/components/app/dashboard/recent-activity';
import { sampleUser } from '@/lib/data';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
    const progress = (sampleUser.currentBand / sampleUser.targetBand) * 100;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {sampleUser.email.split('@')[0]}!</h1>
            <p className="text-muted-foreground">Here's your progress overview. Keep up the great work!</p>
            
            <StatsCards />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <LearningPath />
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress to Target</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span>Current: {sampleUser.currentBand}</span>
                                <span className="font-bold text-primary">Target: {sampleUser.targetBand}</span>
                            </div>
                            <Progress value={progress} />
                            <p className="text-center text-xs text-muted-foreground mt-2">{progress.toFixed(0)}% to your goal</p>
                        </CardContent>
                    </Card>
                    <RecentActivity />
                </div>
            </div>
        </div>
    );
}
