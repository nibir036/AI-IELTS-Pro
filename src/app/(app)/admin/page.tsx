'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Headphones, Mic, BookOpen, ArrowRight } from 'lucide-react';
import { processContent, type ProcessContentOutput } from '@/ai/flows/content-factory-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

type ContentType = 'Lesson' | 'ReadingTest' | 'ListeningTest' | 'WritingTest' | 'SpeakingPrompt';

const creationCards = [
    {
        title: "Writing Test",
        description: "Manually craft a new Writing test.",
        icon: FileText,
        href: "/admin/create/writing",
        isReady: true,
    },
     {
        title: "Listening Test",
        description: "Upload audio or use AI generation.",
        icon: Headphones,
        href: "/admin/create/listening",
        isReady: true,
    },
    {
        title: "Speaking Test",
        description: "Build a new Speaking test.",
        icon: Mic,
        href: "/admin/create/speaking",
        isReady: true,
    },
     {
        title: "Reading Test",
        description: "Feature under development.",
        icon: BookOpen,
        href: "/admin/create/reading",
        isReady: false,
    }
]

export default function AdminPage() {
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessContentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleProcess = async () => {
    if (!firestore) {
        setError("Firestore is not available. Please try again later.");
        toast({
            variant: 'destructive',
            title: "Database Error",
            description: "Could not connect to the database.",
        });
        return;
    }
     if (!contentType) {
        setError("Please select a content type.");
        return;
    }
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      const aiResult = await processContent({ contentType, rawText: inputText });
      setResult(aiResult);

      let targetCollection: string;
      let documentId: string;

      if ('skill' in aiResult) { // It's a Test
          documentId = aiResult.id;
          if (aiResult.skill === 'Reading') {
              targetCollection = 'readingTests';
          } else if (aiResult.skill === 'Listening') {
              targetCollection = 'listeningTests';
          } else if (aiResult.skill === 'Writing') {
              targetCollection = 'mockTests';
          }
           else {
              throw new Error("Unsupported test skill from AI");
          }
      } else if ('type' in aiResult) { // It's a Lesson (or Speaking Prompt)
          documentId = aiResult.id;
          targetCollection = 'lessons';
      } else {
          throw new Error("Invalid AI output structure");
      }
      
      const docRef = doc(firestore, targetCollection, documentId);
      await setDoc(docRef, aiResult);

      toast({
        title: "Content Saved!",
        description: `New content was successfully saved to '${targetCollection}'.`,
      });

    } catch (err: any) {
      console.error("Error processing content:", err);
      const errorMessage = err.message?.includes('overloaded') || err.message?.includes('503')
        ? "The AI service is currently overloaded. Please try again in a moment."
        : `An error occurred: ${err.message}`;
      setError(errorMessage);
       toast({
        variant: 'destructive',
        title: "Processing Failed",
        description: errorMessage,
      });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your app's content using AI-powered tools or manual creation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Content Factory</CardTitle>
            <CardDescription>
             Paste raw text from any source (e.g., PDF, article, notes) and let the AI structure it into a lesson or test, then save it directly to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
                  <SelectTrigger>
                      <SelectValue placeholder="1. Select content type..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Lesson">Lesson (Grammar, Vocabulary, Tips)</SelectItem>
                      <SelectItem value="SpeakingPrompt">Speaking Prompt</SelectItem>
                      <SelectItem value="WritingTest">Writing Test</SelectItem>
                      <SelectItem value="ReadingTest">Reading Test</SelectItem>
                      <SelectItem value="ListeningTest">Listening Test (from Transcript)</SelectItem>
                  </SelectContent>
              </Select>

              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="2. Paste your raw text content here..."
                className="flex-grow text-base min-h-[300px]"
                disabled={!contentType}
              />
              <Button onClick={handleProcess} disabled={isProcessing || !inputText || !contentType}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                3. Process & Save Content
              </Button>
            </div>
             <div className="relative">
                <p className="text-sm font-medium mb-2">AI Output Review</p>
                <div className="p-4 bg-muted rounded-md h-full min-h-[300px] overflow-x-auto text-sm">
                  {isProcessing && (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {error && <p className="text-destructive whitespace-pre-wrap">{error}</p>}
                  {result && (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                  {!isProcessing && !result && !error && (
                      <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                          <p>Output will be shown here.</p>
                      </div>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>

         <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Manual Content Creation</CardTitle>
            <CardDescription>
             Manually create and configure specific tests for each module.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {creationCards.map(card => (
                  <Link key={card.title} href={card.isReady ? card.href : '#'} className={!card.isReady ? "pointer-events-none" : ""}>
                    <div className={`p-4 border rounded-lg h-full flex flex-col justify-between transition-all ${card.isReady ? 'hover:border-primary hover:shadow-md' : 'bg-muted/50'}`}>
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold">{card.title}</h3>
                                <card.icon className={`h-5 w-5 ${card.isReady ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                        </div>
                        <div className={`flex items-center mt-4 text-sm font-medium ${card.isReady ? 'text-primary' : 'text-muted-foreground'}`}>
                             {card.isReady ? 'Create Test' : 'Coming Soon'}
                             {card.isReady && <ArrowRight className="ml-2 h-4 w-4" />}
                        </div>
                    </div>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
