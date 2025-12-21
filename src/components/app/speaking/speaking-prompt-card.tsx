
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Languages, Loader2, PlayCircle } from 'lucide-react';
import { getTranslation } from '@/ai/flows/multilingual-support';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { SpeakingTest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface SpeakingPromptCardProps {
  prompt: SpeakingTest;
}

export function SpeakingPromptCard({ prompt }: SpeakingPromptCardProps) {
  const { user } = useUserProfile();
  const { toast } = useToast();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="secondary">{prompt.skill} Test</Badge>
            <CardTitle className="mt-2">{prompt.title}</CardTitle>
          </div>
           <Button asChild>
            <Link href={`/speaking/${prompt.id}`}>
              <PlayCircle className="mr-2" /> Start Practice
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>
            This is a full speaking test with three parts. You will be asked questions about the topic of '{prompt.title}'.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
