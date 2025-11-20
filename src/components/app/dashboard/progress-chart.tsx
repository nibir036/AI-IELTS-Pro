
'use client';

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';

interface ProgressChartProps {
  currentBand: number;
  targetBand: number;
}

export function ProgressChart({ currentBand, targetBand }: ProgressChartProps) {
  const percentage = targetBand > 0 ? (currentBand / targetBand) * 100 : 0;
  const data = [{ name: 'progress', value: percentage }];

  return (
    <div className="h-48 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
            className="fill-primary"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-primary">{currentBand.toFixed(1)}</p>
        <p className="text-sm text-muted-foreground">/ {targetBand.toFixed(1)} Target</p>
      </div>
       <p className="text-center text-xs text-muted-foreground mt-2">{percentage > 0 ? percentage.toFixed(0) : 0}% of the way to your goal. Keep going!</p> 
    </div>
  );
}
