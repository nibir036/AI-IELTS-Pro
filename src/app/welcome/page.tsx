'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/app/auth-guard';
import { FileText, ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4 text-2xl">One Last Step!</CardTitle>
            <CardDescription className="text-base">
              Let's find out your current English level. Please complete a short writing test. Our AI will analyze it to create your personalized learning plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm text-muted-foreground">
              This will only take a few minutes and is crucial for tailoring the app to your needs.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => router.push('/diagnostic-test')}
            >
              Start Diagnostic Test <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
