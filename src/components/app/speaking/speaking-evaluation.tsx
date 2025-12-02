'use client';

import { useState, useRef, useEffect } from 'react';
import { evaluateSpeaking } from '@/ai/flows/speaking-evaluation-flow';
import type { AiPoweredSpeakingEvaluationOutput } from '@/lib/types';
import { SpeakingEvaluationResults } from './speaking-evaluation-results';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, StopCircle, Send, VideoOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

import { useFirebase } from '@/firebase';
import { collection, doc, increment, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/hooks/use-user-profile';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadAudioFromClient } from '@/firebase/client-storage';

// Dynamically import WaveSurfer and RecordPlugin to ensure they only run on the client
let WaveSurfer: any = null;
let RecordPlugin: any = null;
if (typeof window !== 'undefined') {
  import('wavesurfer.js').then(module => {
    WaveSurfer = module.default;
  });
  import('wavesurfer.js/dist/plugins/record.esm.js').then(module => {
    RecordPlugin = module.default;
  });
}

interface SpeakingEvaluationProps {
  task: string;
  testId: string;
}

export function SpeakingEvaluation({ task, testId }: SpeakingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<AiPoweredSpeakingEvaluationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const wavesurferRef = useRef<any | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const recordPluginRef = useRef<any | null>(null);

  const { auth, firestore, user: authUser } = useFirebase();
  const { user: userProfile } = useUserProfile();
  const { toast } = useToast();
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!auth) return;
    // Set up the onAuthStateChanged listener to know when Firebase Auth is ready.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsAuthReady(true); // Mark auth as ready regardless of whether there's a user
    });
    return () => unsubscribe(); // Cleanup listener on unmount
  }, [auth]);


  useEffect(() => {
    if (!WaveSurfer || !RecordPlugin) return;

    const getMicPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setHasMicPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings.',
        });
      }
    };

    getMicPermission();
  }, [toast]);

  useEffect(() => {
    // This effect initializes WaveSurfer and the Record plugin
    // It will only run AFTER hasMicPermission is true.
    if (waveformRef.current && hasMicPermission && WaveSurfer && RecordPlugin && !wavesurferRef.current) {
        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: 'hsl(var(--muted-foreground))',
            progressColor: 'hsl(var(--primary))',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
        });

        wavesurferRef.current = wavesurfer;
        
        const record = wavesurfer.registerPlugin(RecordPlugin.create({
            scrollingWaveform: true,
            renderRecordedAudio: true,
        }));
        recordPluginRef.current = record;

        record.on('record-end', (blob: Blob) => {
            console.log("Recording ended, blob size:", blob.size);
            if (blob.size === 0) {
              setError("Recording failed. The audio blob is empty. Please check your microphone.");
              toast({
                variant: "destructive",
                title: "Recording Failed",
                description: "No audio was captured. Please check your microphone and browser permissions."
              });
            } else {
              setAudioBlob(blob);
            }
        });

        return () => {
            record.destroy();
            wavesurfer.destroy();
        };
    }
  }, [hasMicPermission]); // Dependency on hasMicPermission ensures correct order

  const handleStartRecording = async () => {
    if (recordPluginRef.current && recordPluginRef.current.isRecording()) {
      return;
    }
    if (recordPluginRef.current) {
        setError(null);
        setResult(null);
        setAudioBlob(null);
        setIsRecording(true);
        if (!startTimeRef.current) {
          startTimeRef.current = new Date();
        }
        try {
          await recordPluginRef.current.startRecording();
        } catch (err) {
          console.error("Error starting recording:", err);
          setError("Could not start recording. Please check microphone permissions.");
          setIsRecording(false);
        }
    }
  };

  const handleStopRecording = () => {
    if (recordPluginRef.current && recordPluginRef.current.isRecording()) {
        recordPluginRef.current.stopRecording();
        setIsRecording(false);
    }
  };

  async function handleSubmit() {
    if (!authUser || !firestore || !userProfile) {
        setError("User not authenticated — cannot upload. Please log in and try again.");
        return;
    }
    if (!audioBlob) {
        setError("No audio recorded. Please record your response first.");
        return;
    }
    if (audioBlob.size < 1000) { // Check for a reasonably sized blob
        setError("Cannot submit a very short or empty recording. Please record your response again.");
        return;
    }
    
    console.log("Upload initiated by UID:", authUser.uid);
    
    setIsLoading(true);
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const uniqueFilename = `${uuidv4()}.wav`;
      const filePath = `speaking-submissions/${authUser.uid}/${uniqueFilename}`;
      
      const { publicUrl, path } = await uploadAudioFromClient(audioBlob, filePath, authUser);
      
      setIsUploading(false);
      
      const uploadRef = doc(collection(firestore, 'uploads'));
      setDocumentNonBlocking(uploadRef, {
          userId: authUser.uid,
          filePath: path,
          publicUrl: publicUrl,
          createdAt: serverTimestamp(),
      });
      
      const aiReport = await evaluateSpeaking({
        task: task,
        filePath: path,
      });
      setResult(aiReport);

      const submissionRef = doc(collection(firestore, 'users', authUser.uid, 'submissions'));
      setDocumentNonBlocking(submissionRef, {
          skill: 'Speaking',
          testId: testId,
          inputData: publicUrl,
          aiReport: aiReport,
          scoreBand: aiReport.scoreBand,
          timestamp: serverTimestamp(),
      });
      
      const practiceTime = startTimeRef.current ? Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000 / 60) : 0;
      const newTotalSubmissions = (userProfile.totalPracticeTime / 5 || 0) + 1;
      const newAverageBand = ((userProfile.currentBand * (newTotalSubmissions - 1)) + aiReport.scoreBand) / newTotalSubmissions;

      const userRef = doc(firestore, 'users', authUser.uid);
      updateDocumentNonBlocking(userRef, {
        currentBand: newAverageBand,
        totalPracticeTime: increment(practiceTime > 1 ? practiceTime : 1)
      });

      toast({
        title: "Evaluation Complete!",
        description: `Your speaking score of ${aiReport.scoreBand.toFixed(1)} has been saved.`,
      });

    } catch (e: any) {
      setError(`An error occurred during evaluation: ${e.message || 'Please try again.'}`);
      console.error(e);
       toast({
        variant: "destructive",
        title: "Evaluation Failed",
        description: "Something went wrong while processing your request.",
      });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  }
  
  const isSubmitDisabled = isLoading || isRecording || !audioBlob || !isAuthReady || !authUser;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">Speaking Task</Badge>
          <CardTitle className="pt-2">{task}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasMicPermission === null && <div className="flex items-center justify-center h-24 bg-muted rounded-lg"><Loader2 className="animate-spin" /></div>}

          {hasMicPermission === false && (
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Microphone Access Required</AlertTitle>
              <AlertDescription>
                Please enable microphone access in your browser settings to use the recording feature.
              </AlertDescription>
            </Alert>
          )}

          {hasMicPermission && (
            <>
              <div ref={waveformRef} id="waveform" className="w-full h-24 bg-muted rounded-lg"></div>
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {!isRecording ? (
                  <Button onClick={handleStartRecording} disabled={isLoading}>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                  </Button>
                  ) : (
                  <Button onClick={handleStopRecording} variant="destructive">
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop Recording
                  </Button>
                  )}

                  <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full sm:w-auto">
                      {isLoading && isUploading && (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                      )}
                      {isLoading && !isUploading && (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</>
                      )}
                      {!isLoading && (
                          <><Send className="mr-2 h-4 w-4" />Submit for AI Evaluation</>
                      )}
                  </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm text-center">{error}</p>}

      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">
                {isUploading ? "Uploading your recording..." : "Our AI is analyzing your response..."}
            </p>
            <p className="text-sm text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}

      {result && <div className="mt-8"><SpeakingEvaluationResults result={result} /></div>}
    </div>
  );
}