'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Headphones, Mic, BookOpen, ArrowRight, UploadCloud } from 'lucide-react';
import { processContent, type ProcessContentOutput } from '@/ai/flows/content-factory-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { blobToBase64, cn } from '@/lib/utils';
import { processPdf } from '@/ai/flows/process-pdf-flow';
import { processImage } from '@/ai/flows/process-image-flow';

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
        isReady: true,
    }
];

export default function AdminPage() {
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ProcessContentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleProcess = async () => {
    if (!firestore) {
        setError("Firestore is not available. Please try again later.");
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
      if ('skill' in aiResult) {
          switch (aiResult.skill) {
              case 'Reading': targetCollection = 'readingTests'; break;
              case 'Listening': targetCollection = 'listeningTests'; break;
              case 'Writing': targetCollection = 'mockTests'; break;
              default: targetCollection = 'lessons';
          }
      } else {
          targetCollection = 'lessons';
      }
      
      const docRef = doc(firestore, targetCollection, aiResult.id);
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

  const handleFileUpload = async (file: File) => {
    if (!file) return;
  
    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Please upload a file smaller than 100MB.',
      });
      return;
    }
  
    setIsUploading(true);
    setError(null);
  
    try {
      const base64Data = (await blobToBase64(file)).split(',')[1];
      let result;
      
      if (file.type.startsWith('image/')) {
        result = await processImage({ imageData: base64Data, fileName: file.name });
      } else if (file.type === 'application/pdf') {
        result = await processPdf({ pdfData: base64Data, fileName: file.name });
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or an image.');
      }
      
      toast({
        title: 'File Processed',
        description: `Successfully extracted and stored ${result.chunkCount} knowledge chunks from ${file.name}.`,
      });
  
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'File Upload Failed',
        description: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
    }
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your app's content using AI-powered tools or manual creation.
        </p>
      </div>

      
        <Card>
           <CardHeader>
            <CardTitle>AI Content Factory</CardTitle>
            <CardDescription>
             Use the AI to structure raw text into lessons or tests, or upload a file to train the AI with new knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Train AI with a File</h3>
                    <div className="flex items-center justify-center w-full" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                        <label htmlFor="file-upload" className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted", isDragging && "border-primary bg-primary/10")}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500">PDF or Image (MAX. 100MB)</p>
                            </div>
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,image/*" disabled={isUploading} />
                        </label>
                    </div>
                     {isUploading && <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> <span>Processing File...</span></div>}
                </div>
                
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Generate from Raw Text</h3>
                    <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Or paste your raw text content here..."
                        className="text-sm min-h-[128px]"
                    />
                </div>
            </div>
             <div className="flex flex-col sm:flex-row items-center gap-4">
                 <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Select content type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Lesson">Lesson (Grammar, Vocab, etc.)</SelectItem>
                        <SelectItem value="SpeakingPrompt">Speaking Prompt</SelectItem>
                        <SelectItem value="WritingTest">Writing Test</SelectItem>
                        <SelectItem value="ReadingTest">Reading Test</SelectItem>
                        <SelectItem value="ListeningTest">Listening Test (from Transcript)</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleProcess} disabled={isProcessing || !inputText || !contentType} className="w-full sm:w-auto">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate & Save from Text
                </Button>
            </div>
             {error && <p className="text-destructive text-sm font-medium">{error}</p>}
             {result && (
                  <div className="relative mt-4">
                    <p className="text-sm font-medium mb-2">AI Output Review</p>
                    <div className="p-4 bg-muted rounded-md h-full max-h-80 overflow-x-auto text-sm">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>
              )}
          </CardContent>
        </Card>

         <Card>
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
  );
}
