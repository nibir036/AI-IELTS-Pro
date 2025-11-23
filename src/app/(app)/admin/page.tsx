
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { processContent, type ProcessContentOutput } from '@/ai/flows/content-factory-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ContentType = 'Lesson' | 'ReadingTest' | 'ListeningTest';

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
          } else {
              throw new Error("Unsupported test type");
          }
      } else if ('type' in aiResult) { // It's a Lesson
          documentId = aiResult.id;
          targetCollection = 'lessons';
      } else {
          throw new Error("Invalid AI output structure");
      }
      
      const docRef = doc(firestore, targetCollection, documentId);
      setDocumentNonBlocking(docRef, aiResult);

      toast({
        title: "Content Generated!",
        description: `New content has been generated and is being saved to the '${targetCollection}' collection.`,
      });

    } catch (err: any) {
      console.error("Error processing content:", err);
      const errorMessage = err.message?.includes('overloaded') || err.message?.includes('503')
        ? "The AI service is currently overloaded. Please try again in a moment."
        : `An error occurred while processing the content: ${err.message}`;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test &amp; Lesson Builder</h1>
        <p className="text-muted-foreground">
          Use this tool to process raw text into structured lessons or tests for the platform.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Create Your Content</CardTitle>
            <CardDescription>
             Select the type of content, then paste the text for a lesson, reading test, or listening test.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select content type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Lesson">Lesson (Grammar, Vocabulary, Tips)</SelectItem>
                    <SelectItem value="ReadingTest">Reading Test</SelectItem>
                    <SelectItem value="ListeningTest">Listening Test</SelectItem>
                </SelectContent>
            </Select>

            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your raw text content here..."
              className="min-h-[400px] text-base"
              disabled={!contentType}
            />
            <Button onClick={handleProcess} disabled={isProcessing || !inputText || !contentType}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process & Save Content
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Review AI Output</CardTitle>
            <CardDescription>
              The processed JSON will appear here. It will be saved to the appropriate Firestore collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing && (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error && <p className="text-destructive">{error}</p>}
            {result && (
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
            {!isProcessing && !result && (
                <div className="text-center text-muted-foreground p-8 border-dashed border rounded-md">
                    <p>Output will be shown here.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
