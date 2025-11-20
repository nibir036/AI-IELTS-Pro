'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { processContentIntoLesson, type ProcessContentOutput } from '@/ai/flows/content-factory-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function AdminPage() {
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
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      const aiResult = await processContentIntoLesson({ rawText: inputText });
      setResult(aiResult);
      
      // Save the result to Firestore without awaiting, using the non-blocking helper
      const lessonsCollection = collection(firestore, 'lessons');
      addDocumentNonBlocking(lessonsCollection, aiResult);

      toast({
        title: "Lesson Generated!",
        description: "The new lesson has been generated and is being saved to the database.",
      });

    } catch (err: any) {
      console.error("Error processing content:", err);
      const errorMessage = err.message?.includes('overloaded') || err.message?.includes('503')
        ? "The AI service is currently overloaded. Please try again in a moment."
        : "An error occurred while processing the content.";
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
        <h1 className="text-3xl font-bold tracking-tight">Content Factory</h1>
        <p className="text-muted-foreground">
          Use this tool to process raw text into structured lessons for the platform.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Paste Your Content</CardTitle>
            <CardDescription>
              Paste the text from a lesson or article below to convert it into a structured format.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your raw text content here..."
              className="min-h-[400px] text-base"
            />
            <Button onClick={handleProcess} disabled={isProcessing || !inputText}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process & Save Lesson
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Review AI Output</CardTitle>
            <CardDescription>
              The processed JSON will appear here. This will be saved to the 'lessons' collection in Firestore.
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
