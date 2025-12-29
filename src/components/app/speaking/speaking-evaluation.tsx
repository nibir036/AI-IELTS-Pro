
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { evaluateSpeaking } from '@/ai/flows/speaking-evaluation-flow';
import type { AiPoweredSpeakingEvaluationOutput, SpeakingTest } from '@/lib/types';
import { SpeakingEvaluationResults } from './speaking-evaluation-results';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Mic, StopCircle, Send, VideoOff, ArrowLeft, ArrowRight, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, increment, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

let WaveSurfer: any = null;
let RecordPlugin: any = null;
if (typeof window !== 'undefined') {
  import('wavesurfer.js').then(module => { WaveSurfer = module.default; });
  import('wavesurfer.js/dist/plugins/record.esm.js').then(module => { RecordPlugin = module.default; });
}

interface SpeakingEvaluationProps {
  test: SpeakingTest;
}

export function SpeakingEvaluation({ test }: SpeakingEvaluationProps) {
  const [currentPart, setCurrentPart] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For both upload and AI eval
  const [finalResult, setFinalResult] = useState<AiPoweredSpeakingEvaluationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const [audioBlobs, setAudioBlobs] = useState<{ [key: number]: Blob }>({});
  
  const wavesurferRef = useRef<any | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const recordPluginRef = useRef<any | null>(null);

  const { auth, firestore, user: authUser } = useFirebase();
  const { user: userProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const initializeRecorder = useCallback(() => {
    if (waveformRef.current && hasMicPermission && WaveSurfer && RecordPlugin && !wavesurferRef.current) {
        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current, waveColor: 'hsl(var(--muted-foreground))', progressColor: 'hsl(var(--primary))',
            barWidth: 2, barGap: 1, barRadius: 2, height: 80,
        });
        wavesurferRef.current = wavesurfer;
        
        const record = wavesurfer.registerPlugin(RecordPlugin.create({ scrollingWaveform: true, renderRecordedAudio: true }));
        recordPluginRef.current = record;

        record.on('record-end', (blob: Blob) => {
            if (blob.size > 1000) {
              setAudioBlobs(prev => ({ ...prev, [currentPart]: blob }));
            } else {
              setError("Recording failed or was too short. Please try again.");
            }
        });
        return () => { record.destroy(); wavesurfer.destroy(); wavesurferRef.current = null; };
    }
  }, [hasMicPermission, currentPart]);
  
  useEffect(() => {
     const cleanup = initializeRecorder();
     return cleanup;
  }, [initializeRecorder]);

  useEffect(() => {
    const getMicPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
      } catch (err) {
        setHasMicPermission(false);
        toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone permissions in your browser settings.'});
      }
    };
    getMicPermission();
  }, [toast]);

  const handleStartRecording = async () => {
    if (recordPluginRef.current?.isRecording()) return;
    setError(null);
    setAudioBlobs(prev => { const newBlobs = {...prev}; delete newBlobs[currentPart]; return newBlobs; });
    setIsRecording(true);
    try {
      await recordPluginRef.current.startRecording();
    } catch (err) {
      setError("Could not start recording. Please check microphone permissions.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (recordPluginRef.current?.isRecording()) {
      recordPluginRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (part: number, blob: Blob) => {
      const formData = new FormData();
      formData.append('audio', blob, `part${part}.wav`);
      formData.append('userId', authUser!.uid);
      const response = await fetch('/api/upload-speaking-audio', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Failed to upload audio for Part ${part}.`);
      const { filePath } = await response.json();
      return filePath;
  }

  const handleFullSubmit = async () => {
    if (!authUser || !firestore || !userProfile || Object.keys(audioBlobs).length !== 3) {
      setError("Please complete all three parts before submitting.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFinalResult(null);

    try {
        const filePaths: { [key: string]: string } = {};
        let combinedTask = `PART 1:\n${test.part1}\n\nPART 2:\n${test.part2}\n\nPART 3:\n${test.part3}`;

        for (const part of [1, 2, 3]) {
            filePaths[`part${part}`] = await uploadAudio(part, audioBlobs[part]);
        }
        
        // This flow needs to be updated to handle multiple audio files or a combined analysis logic.
        // For now, we will evaluate based on Part 2 audio as it's the most substantial.
        const aiReport = await evaluateSpeaking({
            task: combinedTask,
            filePath: filePaths['part2'], // Pass the most important audio file for now
        });

        setFinalResult(aiReport);
        
        const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
        setDocumentNonBlocking(submissionRef, {
            skill: 'Speaking', testId: test.id, inputData: filePaths, aiReport: aiReport,
            scoreBand: aiReport.scoreBand, timestamp: serverTimestamp(),
        });
        
        const newAverageBand = ((userProfile.currentBand * (userProfile.totalPracticeTime / 5 || 1)) + aiReport.scoreBand) / ((userProfile.totalPracticeTime / 5 || 1) + 1);
        updateDocumentNonBlocking(doc(firestore, 'users', authUser.uid), {
            currentBand: newAverageBand, totalPracticeTime: increment(5) // Average time
        });

        toast({ title: "Evaluation Complete!", description: `Your speaking score of ${aiReport.scoreBand.toFixed(1)} has been saved.` });

    } catch (e: any) {
      setError(`An error occurred: ${e.message}`);
      console.error(e);
      toast({ variant: "destructive", title: "Evaluation Failed", description: "Something went wrong." });
    } finally {
      setIsProcessing(false);
    }
  };

  const tasks = { 1: test.part1, 2: test.part2, 3: test.part3 };
  const currentTaskText = tasks[currentPart as keyof typeof tasks];
  
  if (finalResult) {
      return (
          <div className="space-y-6">
              <Button onClick={() => router.push('/speaking')}><ArrowLeft className="mr-2" /> Back to All Prompts</Button>
              <SpeakingEvaluationResults result={finalResult} />
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">{test.title}</h1>
            <Badge variant="secondary" className="text-lg">Part {currentPart} / 3</Badge>
          </div>
           <Progress value={(currentPart / 3) * 100} className="mt-2" />
        </CardHeader>
        <CardContent>
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle>Part {currentPart} Task</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-line text-muted-foreground">{currentTaskText}</CardContent>
            </Card>

          {hasMicPermission === false && (
            <Alert variant="destructive" className="mt-4"><XCircle className="h-4 w-4" />
              <AlertTitle>Microphone Access Required</AlertTitle>
              <AlertDescription>Please enable microphone permissions to record.</AlertDescription>
            </Alert>
          )}

          {hasMicPermission && (
            <>
              <div ref={waveformRef} id="waveform" className="w-full h-24 bg-muted rounded-lg mt-4"></div>
              <div className="mt-4 flex items-center justify-center gap-4">
                  {!isRecording ? (
                    <Button onClick={handleStartRecording} disabled={isProcessing}>
                        <Mic className="mr-2" /> {audioBlobs[currentPart] ? 'Record Again' : 'Start Recording'}
                    </Button>
                  ) : (
                    <Button onClick={handleStopRecording} variant="destructive"><StopCircle className="mr-2" /> Stop Recording</Button>
                  )}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentPart(p => p - 1)} disabled={currentPart === 1 || isRecording || isProcessing}><ArrowLeft className="mr-2"/> Previous</Button>
            
            {currentPart < 3 ? (
                 <Button onClick={() => setCurrentPart(p => p + 1)} disabled={isRecording || isProcessing || !audioBlobs[currentPart]}>Next Part <ArrowRight className="ml-2"/></Button>
            ) : (
                 <Button onClick={handleFullSubmit} disabled={isProcessing || isRecording || Object.keys(audioBlobs).length !== 3}>
                    {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
                    Submit Full Test
                </Button>
            )}
        </CardFooter>
      </Card>
      {error && <p className="text-destructive text-sm text-center">{error}</p>}
    </div>
  );
}
