import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Target, Clock, TrendingUp } from 'lucide-react';
import type { User } from '@/lib/types';

interface StatsCardsProps {
  user: User;
}

export function StatsCards({ user }: StatsCardsProps) {
  const stats = [
    {
      title: 'Current Band',
      value: user.currentBand.toFixed(1),
      icon: GraduationCap,
    },
    {
      title: 'Target Band',
      value: user.targetBand.toFixed(1),
      icon: Target,
    },
    {
      title: 'Practice Time',
      value: `${(user.totalPracticeTime / 60).toFixed(1)}h`,
      icon: Clock,
    },
    {
      title: 'Progress',
      value: '+0.0',
      description: 'Last 30 days',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && user.currentBand > 0 && <p className="text-xs text-muted-foreground">{stat.description}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
