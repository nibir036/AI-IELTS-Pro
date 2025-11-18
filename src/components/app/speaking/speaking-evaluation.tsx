'use client';

import { useState, useRef, useEffect } from 'react';
import { aiPoweredSpeakingEvaluation } from '@/ai/flows/ai-powered-speaking-evaluation';
import type { AiSpeakingReport } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, StopCircle, Sparkles, Send, VideoOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface SpeakingEvaluationProps {
  task: string;
}

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


export function SpeakingEvaluation({ task }: SpeakingEvaluationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<AiSpeakingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  
  const wavesurferRef = useRef<any | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const recordPluginRef = useRef<any | null>(null);

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
  }, []);

  useEffect(() => {
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
            setAudioBlob(blob);
        });

        return () => {
            record.destroy();
            wavesurfer.destroy();
        };
    }
  }, [hasMicPermission]);

  const handleStartRecording = async () => {
    if (recordPluginRef.current && recordPluginRef.current.isRecording()) {
      return;
    }
    if (recordPluginRef.current) {
        setResult(null);
        setAudioBlob(null);
        setIsRecording(true);
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

  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  }

  async function handleSubmit() {
    if (!audioBlob) {
        setError("No audio recorded. Please record your response first.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const audioDataUri = await blobToDataURL(audioBlob);
      const response = await aiPoweredSpeakingEvaluation({
        task: task,
        audioDataUri: audioDataUri,
      });
      setResult(response);
    } catch (e) {
      setError("An error occurred during evaluation. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }
  
  const renderResults = () => {
    if(!result) return null;
    return (
        <Card className="mt-8 animate-in fade-in-50 duration-500">
            <CardHeader>
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl flex items-center gap-2"><Sparkles className="text-accent" /> AI Evaluation Result</CardTitle>
                        <CardDescription>Here's your detailed feedback for your speaking performance.</CardDescription>
                    </div>
                    <div className="text-center w-full sm:w-auto rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Estimated Band</p>
                        <p className="text-4xl font-bold text-primary">{result.scoreBand.toFixed(1)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">Overall Feedback</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{result.overallFeedback}</p>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Pronunciation</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{result.pronunciationFeedback}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-base">Fluency</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{result.fluencyFeedback}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-base">Coherence</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{result.coherenceFeedback}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-base">Grammar</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{result.grammarFeedback}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-base">Vocabulary</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{result.vocabularyFeedback}</p></CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">Speaking Task</Badge>
          <CardTitle className="pt-2">IELTS Speaking Part 2</CardTitle>
          <CardDescription>{task}</CardDescription>
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

                  <Button onClick={handleSubmit} disabled={isLoading || isRecording || !audioBlob} className="w-full sm:w-auto">
                      {isLoading ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Evaluating...
                      </>
                      ) : (
                          <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit for AI Evaluation
                          </>
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
            <p className="font-semibold">Our AI is analyzing your response...</p>
            <p className="text-sm text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
      )}

      {result && renderResults()}
    </div>
  );
}
