'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SpeakingEvaluation } from './speaking-evaluation';
import { Languages, Loader2, PlayCircle } from 'lucide-react';
import { getTranslation } from '@/ai/flows/multilingual-support';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Lesson } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SpeakingPromptCardProps {
  prompt: Lesson;
}

export function SpeakingPromptCard({ prompt }: SpeakingPromptCardProps) {
  const { user } = useUserProfile();
  const { toast } = useToast();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');

  const handleTranslate = async () => {
    if (!user?.nativeLanguage) {
      toast({
        variant: 'destructive',
        title: 'Language not set',
        description: 'Please set your native language in settings.',
      });
      return;
    }
    if (translatedText) return; // Don't re-translate

    setIsTranslating(true);
    try {
      const result = await getTranslation({
        text: prompt.content_en,
        nativeLanguage: user.nativeLanguage,
      });
      setTranslatedText(result.translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: 'Could not translate the prompt at this time.',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="secondary">{prompt.level} Topic</Badge>
            <CardTitle className="mt-2">{prompt.title}</CardTitle>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlayCircle className="mr-2" /> Start Practice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Speaking Practice Session</DialogTitle>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto p-1">
                <SpeakingEvaluation task={prompt.content_en} testId={prompt.id} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{prompt.content_en}</CardDescription>
        {user?.nativeLanguage !== 'English' && (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4" onClick={handleTranslate}>
                        {isTranslating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Languages className="mr-2 h-4 w-4" />
                        )}
                        Translate to {user?.nativeLanguage || 'your language'}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Translation</DialogTitle>
                    </DialogHeader>
                    {isTranslating && <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                    {translatedText && <p className="text-muted-foreground">{translatedText}</p>}
                </DialogContent>
            </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
