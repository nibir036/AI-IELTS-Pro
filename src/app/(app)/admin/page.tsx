'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Factory</h1>
        <p className="text-muted-foreground">
          Use this tool to process raw text into structured lessons for the platform.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Lesson Generator</CardTitle>
            <CardDescription>
                Paste text from a lesson or article below to convert it into a structured format.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Admin content generation tools will be built here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
