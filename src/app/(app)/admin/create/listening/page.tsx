
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Wrench } from 'lucide-react';

export default function CreateListeningTestPage() {
    return (
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                     <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Wrench className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">AI Generation Recommended</CardTitle>
                    <CardDescription className="text-base">
                        Due to server timeouts with long audio generation, listening tests are best created using the AI Content Factory from a transcript.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-6 text-sm text-muted-foreground">
                       Please use the AI Content Factory on the main Admin Dashboard to generate new listening tests from a raw transcript. You can then add the audio URL manually in the Firebase Console.
                    </p>
                    <Button asChild>
                        <Link href="/admin">Back to Admin Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    