
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Headphones, Mic, BookOpen, ArrowRight, UploadCloud, AlertCircle, FileUp, Wrench } from 'lucide-react';
import { processContent, type ProcessContentOutput } from '@/ai/flows/content-factory-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { blobToBase64, cn } from '@/lib/utils';
import { processPdf } from '@/ai/flows/process-pdf-flow';
import { processImage } from '@/ai/flows/process-image-flow';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileInput } from '@/components/ui/file-input';
import { uploadImageToStorage } from '@/lib/firebase/storage';
import { MockTest, WritingQuestion } from '@/lib/types';


type ContentType = 'Lesson' | 'ReadingTest' | 'ListeningTest' | 'WritingTest' | 'SpeakingPrompt';

const creationCards = [
    {
        title: "Writing Test",
        description: "Manually craft a new Writing test, including image uploads for Task 1.",
        href: "/admin/create/writing",
        icon: FileText,
        isReady: true,
    },
     {
        title: "Listening Test",
        description: "Upload audio or use AI to generate audio from a transcript.",
        href: "/admin/create/listening",
        icon: Headphones,
        isReady: true,
    },
    {
        title: "Speaking Test",
        description: "Manually build a new Speaking test with prompts for all three parts.",
        href: "/admin/create/speaking",
        icon: Mic,
        isReady: true,
    },
     {
        title: "Reading Test",
        description: "Use the AI Content Factory to generate complex reading tests.",
        href: "/admin/create/reading",
        icon: Wrench,
        isReady: true,
    }
];

export default function AdminPage() {
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [answers, setAnswers] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [partialTestData, setPartialTestData] = useState<MockTest | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const { toast } = useToast();
  const { firestore } = useFirebase();

  const methods = useForm<{ manualImageFile: FileList | null }>();
  
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
    setPartialTestData(null);
    methods.reset();
    
    try {
      const aiResult = await processContent({ 
        contentType, 
        rawText: inputText,
        transcript: contentType === 'ListeningTest' ? transcript : undefined,
        answers: contentType === 'ListeningTest' ? answers : undefined,
       });

      let targetCollection: string;
        if ('skill' in aiResult && aiResult.skill) {
             switch (aiResult.skill) {
                case 'Reading': targetCollection = 'readingTests'; break;
                case 'Listening': targetCollection = 'listeningTests'; break;
                case 'Writing': targetCollection = 'mockTests'; break;
                default: 
                    if ('type' in aiResult && aiResult.type === "ListeningTest") {
                        targetCollection = 'listeningTests';
                        break;
                    }
                    throw new Error(`Unknown skill type for saving: ${aiResult.skill}`);
            }
        } else if ('type' in aiResult && aiResult.type) {
             switch (aiResult.type) {
                case 'Grammar':
                case 'Vocabulary':
                case 'Tips':
                case 'Speaking':
                    targetCollection = 'lessons';
                    break;
                case 'SpeakingPromptSet':
                    // This type is handled inside the flow, but we can return early here.
                     toast({
                        title: "Content Saved!",
                        description: `New speaking prompts were successfully generated and saved.`,
                    });
                    setInputText('');
                    setIsProcessing(false);
                    return;
                default:
                     throw new Error(`Unknown content type for saving: ${aiResult.type}`);
            }
        }
        else {
            throw new Error("Could not determine target collection for saving. The AI result is malformed.");
        }
      
      if ('id' in aiResult && aiResult.id) {
        const docRef = doc(firestore, targetCollection, aiResult.id);
        await setDoc(docRef, aiResult);
        toast({
            title: "Content Saved!",
            description: `New content was successfully saved to '${targetCollection}'.`,
        });
        setInputText(''); // Clear input on success
        setTranscript('');
        setAnswers('');
      } else {
          throw new Error("Generated content is missing a valid 'id' property.");
      }

    } catch (err: any) {
      console.error("Error processing content:", err);
      if (err.message && err.message.includes('Image generation failed. Partial content:')) {
          const jsonString = err.message.substring(err.message.indexOf('{'));
          try {
              const partialResult = JSON.parse(jsonString);
              setPartialTestData(partialResult);
              setError("Image generation failed. Please upload an image for Task 1 and save the test manually.");
          } catch (parseError) {
              setError(`An error occurred: ${err.message}`);
          }
      } else {
        const errorMessage = err.message?.includes('overloaded') || err.message?.includes('503')
          ? "The AI service is currently overloaded. Please try again in a moment."
          : `An error occurred: ${err.message}`;
        setError(errorMessage);
         toast({
          variant: 'destructive',
          title: "Processing Failed",
          description: errorMessage,
        });
      }
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleSaveWithManualImage = async (data: { manualImageFile: FileList | null }) => {
      const file = data.manualImageFile?.[0];
      if (!file || !partialTestData) {
          toast({ variant: 'destructive', title: 'Error', description: 'Missing image file or test data.' });
          return;
      }
      if (!firestore) {
          toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
          return;
      }

      setIsSavingManual(true);

      try {
          const base64Image = (await blobToBase64(file)).split(',')[1];
          const filePath = `writing-tasks/${partialTestData.id}/task1_image.png`;
          const imageUrl = await uploadImageToStorage(base64Image, file.type, filePath);

          const updatedResult = { ...partialTestData };
          const task1Index = updatedResult.questions.findIndex(q => q.taskType === 'Task 1');
          if (task1Index !== -1) {
              (updatedResult.questions[task1Index] as WritingQuestion).imageUrl = imageUrl;
          } else {
              throw new Error("Could not find Task 1 in the partial test data.");
          }
          
          const docRef = doc(firestore, 'mockTests', updatedResult.id);
          await setDoc(docRef, updatedResult);

          setPartialTestData(null);
          methods.reset();
          setError(null);
          setInputText('');
          toast({
              title: 'Success!',
              description: 'Writing test has been saved with the manually uploaded image.',
          });

      } catch (err: any) {
          console.error("Error saving with manual image:", err);
          setError(`Failed to save test: ${err.message}`);
          toast({
              variant: 'destructive',
              title: 'Save Failed',
              description: err.message,
          });
      } finally {
          setIsSavingManual(false);
      }
  };


  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File Too Large', description: 'Please upload a file smaller than 100MB.'});
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
      toast({ title: 'File Processed', description: `Successfully stored ${result.chunkCount} knowledge chunks from ${file.name}.`});
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message);
      toast({ variant: 'destructive', title: 'File Upload Failed', description: err.message });
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
                        placeholder="Paste your raw text, question paper, or topic here..."
                        className="text-sm min-h-[128px]"
                    />
                </div>

                {contentType === 'ListeningTest' && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <h3 className="font-semibold text-sm">Listening Test Transcript</h3>
                       <Textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          placeholder="Paste the full audio transcript here..."
                          className="text-sm min-h-[150px]"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                       <h3 className="font-semibold text-sm">Listening Test Answers</h3>
                       <Textarea
                          value={answers}
                          onChange={(e) => setAnswers(e.target.value)}
                          placeholder="Paste the comma-separated answers here (e.g., answer1,answer2,answer3)..."
                          className="text-sm min-h-[80px]"
                      />
                    </div>
                  </>
                )}
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
             {error && !partialTestData && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
             )}
             {partialTestData && (
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(handleSaveWithManualImage)}>
                        <Card className="mt-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
                            <CardHeader>
                                <AlertTitle className="text-amber-800 dark:text-amber-300 flex items-center gap-2"><FileUp /> Image Generation Failed – Complete Manually</AlertTitle>
                                <AlertDescription className="text-amber-700 dark:text-amber-400 !mt-2">
                                    The AI generated the test content but failed to create an image. Review the topic below, upload a relevant image for Task 1, and save the test.
                                </AlertDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Generated Test Content (Unsaved)</h4>
                                <div className="p-4 bg-background/50 rounded-md h-full max-h-60 overflow-x-auto text-xs border">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(partialTestData, null, 2)}</pre>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Upload Task 1 Image</h4>
                                <FileInput name="manualImageFile" accept="image/*" />
                            </div>
                                <Button 
                                    type="submit"
                                    disabled={isSavingManual}
                                    className="w-full sm:w-auto"
                                >
                                    {isSavingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Test with This Image
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </FormProvider>
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
                  <Link key={card.title} href={card.href} className={!card.isReady ? "pointer-events-none" : ""}>
                    <div className={cn(
                        "p-4 border rounded-lg h-full flex flex-col justify-between transition-all",
                        card.isReady ? 'hover:border-primary hover:shadow-md' : 'bg-muted/50 cursor-not-allowed'
                    )}>
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold">{card.title}</h3>
                                {card.icon && <card.icon className="h-5 w-5 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                        </div>
                        <div className={cn(
                            "flex items-center mt-4 text-sm font-medium",
                            card.isReady ? 'text-primary' : 'text-muted-foreground'
                        )}>
                             Create Test
                             <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                    </div>
                </Link>
              ))}
          </CardContent>
        </Card>
    </div>
  );
}

    