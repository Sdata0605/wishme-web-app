import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListeningAnimation } from './ListeningAnimation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

const IDLE_TIMEOUT = 180_000;
const MAX_SILENT_RESTARTS = 3;
const START_IGNORE_MS = 500;
const RESTART_AFTER_SPEAK_DELAY_MS = 1200;
const POST_SPEAK_IGNORE_MS = 2200;
const DUPLICATE_TRANSCRIPT_WINDOW_MS = 8000;

const pickFemaleVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  const keywords = ['samantha', 'victoria', 'karen', 'zira', 'moira', 'tessa', 'fiona', 'google uk english female', 'google us english', 'female'];

  for (const keyword of keywords) {
    const match = voices.find((voice) => voice.name.toLowerCase().includes(keyword) && voice.lang.startsWith('en'));
    if (match) return match;
  }

  return voices.find((voice) => voice.lang.startsWith('en')) || voices[0] || null;
};

const normalizeTranscript = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const looksLikeAssistantEcho = (transcript: string, lastAssistantResponse: string) => {
  const normalizedTranscript = normalizeTranscript(transcript);
  const normalizedResponse = normalizeTranscript(lastAssistantResponse);

  if (!normalizedTranscript || !normalizedResponse) return false;
  if (normalizedTranscript.length < 8) return false;

  return (
    normalizedResponse.includes(normalizedTranscript) ||
    normalizedTranscript.includes(normalizedResponse.slice(0, Math.min(normalizedResponse.length, 24)))
  );
};

export const GoogleVoiceAssistant = () => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const recognitionRef = useRef<any>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusRef = useRef<VoiceStatus>('idle');
  const isProcessingRef = useRef(false);
  const hasReceivedFinalResultRef = useRef(false);
  const restartCountRef = useRef(0);
  const manualStopRef = useRef(false);
  const ignoreResultsUntilRef = useRef(0);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const lastAssistantResponseRef = useRef('');
  const lastProcessedTranscriptRef = useRef('');
  const lastProcessedAtRef = useRef(0);

  const disconnectRef = useRef<() => void>(() => undefined);
  const processWithAIRef = useRef<(userText: string) => Promise<void>>(async () => undefined);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer();

    idleTimerRef.current = setTimeout(() => {
      if (statusRef.current !== 'idle') {
        disconnectRef.current();
        toast.info('Voice session ended due to inactivity');
      }
    }, IDLE_TIMEOUT);
  }, [clearIdleTimer]);

  const disconnect = useCallback(() => {
    manualStopRef.current = true;
    isProcessingRef.current = false;
    hasReceivedFinalResultRef.current = false;
    restartCountRef.current = 0;
    ignoreResultsUntilRef.current = 0;
    lastProcessedTranscriptRef.current = '';
    lastProcessedAtRef.current = 0;
    lastAssistantResponseRef.current = '';
    conversationHistoryRef.current = [];

    clearIdleTimer();
    clearRestartTimer();

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore browser speech abort errors
    }

    recognitionRef.current = null;
    window.speechSynthesis?.cancel();

    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    setStatus('idle');
    setUserTranscript('');
    setAiResponse('');
  }, [clearIdleTimer, clearRestartTimer]);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickFemaleVoice();

        if (voice) utterance.voice = voice;

        utterance.rate = 1;
        utterance.pitch = 1.05;
        utterance.volume = 1;
        utterance.lang = voice?.lang || 'en-US';

        if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);

        resumeIntervalRef.current = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          } else {
            window.speechSynthesis.resume();
          }
        }, 10000);

        utterance.onend = () => {
          if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          }
          resolve();
        };

        utterance.onerror = () => {
          if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          }
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      }, 120);
    });
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) return;
    if (manualStopRef.current || isProcessingRef.current) return;
    if (statusRef.current === 'processing' || statusRef.current === 'speaking') return;

    hasReceivedFinalResultRef.current = false;
    ignoreResultsUntilRef.current = Date.now() + START_IGNORE_MS;

    try {
      recognition.start();
    } catch {
      // Browser throws if recognition is already started
    }
  }, []);

  const processWithAI = useCallback(async (userText: string) => {
    const cleanedUserText = userText.trim();
    const normalizedUserText = normalizeTranscript(cleanedUserText);

    if (!normalizedUserText) return;
    if (isProcessingRef.current || manualStopRef.current) return;

    isProcessingRef.current = true;
    setStatus('processing');
    setUserTranscript(cleanedUserText);
    setAiResponse('');
    clearRestartTimer();

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore browser speech abort errors
    }

    try {
      console.log('[Voice] Calling ai-assistant with:', cleanedUserText);

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          query: cleanedUserText,
          conversationHistory: conversationHistoryRef.current.slice(-8),
          context: {
            currentRoute: window.location.pathname,
            isVoiceInput: true,
          },
        },
      });

      console.log('[Voice] Response:', { data, error });

      if (error) throw error;

      const responseText = data?.message || data?.response || "Sorry, I didn't understand that. Please try again.";

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current.slice(-6),
        { role: 'user', content: cleanedUserText },
        { role: 'assistant', content: responseText },
      ];

      lastAssistantResponseRef.current = responseText;
      setAiResponse(responseText);
      setStatus('speaking');
      resetIdleTimer();

      await speakText(responseText);

      if (manualStopRef.current) return;

      // End the turn after responding instead of auto-restarting recognition.
      // This prevents the assistant from hearing itself, processing silence,
      // or bouncing between listening/processing on mobile browsers.
      manualStopRef.current = true;
      restartCountRef.current = 0;
      ignoreResultsUntilRef.current = Date.now() + POST_SPEAK_IGNORE_MS;

      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore browser speech abort errors
      }

      recognitionRef.current = null;
      clearRestartTimer();
      setStatus('idle');
    } catch (error) {
      console.error('[Voice] AI error:', error);
      setStatus('error');
      setAiResponse('Something went wrong. Tap to try again.');
      await speakText('Sorry, something went wrong. Please try again.');
      manualStopRef.current = true;
      setStatus('idle');
    } finally {
      isProcessingRef.current = false;
    }
  }, [clearRestartTimer, resetIdleTimer, speakText, startRecognition]);

  useEffect(() => {
    processWithAIRef.current = processWithAI;
  }, [processWithAI]);

  const startSession = useCallback(async () => {
    if (statusRef.current !== 'idle') return;

    try {
      setStatus('connecting');
      manualStopRef.current = false;
      clearRestartTimer();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) throw new Error('Speech recognition not supported');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getTracks().forEach((track) => track.stop());

      window.speechSynthesis?.getVoices();

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (manualStopRef.current) return;
        if (statusRef.current === 'processing' || statusRef.current === 'speaking') return;

        ignoreResultsUntilRef.current = Date.now() + START_IGNORE_MS;
        setStatus('listening');
        resetIdleTimer();
      };

      recognition.onresult = (event: any) => {
        if (manualStopRef.current || isProcessingRef.current) return;
        if (statusRef.current !== 'listening') return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const trimmedInterim = interimTranscript.trim();
        if (trimmedInterim && !finalTranscript.trim()) {
          setUserTranscript(trimmedInterim);
        }

        const trimmedFinal = finalTranscript.trim();
        const normalizedFinal = normalizeTranscript(trimmedFinal);

        if (!normalizedFinal) return;
        if (Date.now() < ignoreResultsUntilRef.current) return;
        if (looksLikeAssistantEcho(trimmedFinal, lastAssistantResponseRef.current)) return;

        const isRecentDuplicate =
          normalizedFinal === lastProcessedTranscriptRef.current &&
          Date.now() - lastProcessedAtRef.current < DUPLICATE_TRANSCRIPT_WINDOW_MS;

        if (isRecentDuplicate) return;

        hasReceivedFinalResultRef.current = true;
        restartCountRef.current = 0;
        lastProcessedTranscriptRef.current = normalizedFinal;
        lastProcessedAtRef.current = Date.now();
        setUserTranscript(trimmedFinal);

        try {
          recognition.stop();
        } catch {
          // Ignore browser speech stop errors
        }

        processWithAIRef.current(trimmedFinal);
      };

      recognition.onerror = (event: any) => {
        console.log('[Voice] Recognition error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Microphone access denied');
          manualStopRef.current = true;
          setStatus('idle');
          return;
        }

        if (event.error === 'audio-capture') {
          toast.error('No microphone was found');
          manualStopRef.current = true;
          setStatus('idle');
          return;
        }

        if (event.error === 'aborted' || manualStopRef.current) return;
      };

      recognition.onend = () => {
        if (manualStopRef.current) return;
        if (isProcessingRef.current) return;
        if (statusRef.current === 'speaking') return;
        if (hasReceivedFinalResultRef.current) return;

        if (statusRef.current === 'listening') {
          restartCountRef.current += 1;
          manualStopRef.current = true;
          recognitionRef.current = null;
          setUserTranscript('No speech detected. Tap to try again.');
          setStatus('idle');
          toast.info('No speech detected');
        }
      };

      recognitionRef.current = recognition;
      startRecognition();
      toast.success('Voice assistant ready! Speak now...');
    } catch (error) {
      console.error('[Voice] Failed to start:', error);
      manualStopRef.current = true;
      setStatus('idle');
      toast.error('Failed to start voice assistant');
    }
  }, [clearRestartTimer, resetIdleTimer, startRecognition]);

  const toggleConnection = useCallback(() => {
    if (statusRef.current === 'idle') {
      startSession();
    } else {
      disconnect();
      toast.info('Voice session ended');
    }
  }, [disconnect, startSession]);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      disconnectRef.current();
    };
  }, []);

  const isActive = status !== 'idle' && status !== 'connecting';

  return (
    <>
      {userTranscript && (
        <div className="fixed bottom-36 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg max-w-xs z-[99]">
          <p className="text-xs text-muted-foreground mb-0.5">You said:</p>
          <p className="text-sm text-foreground line-clamp-3">{userTranscript}</p>
        </div>
      )}

      {aiResponse && (
        <div className="fixed bottom-52 left-4 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-lg px-3 py-2 shadow-lg max-w-xs z-[99]">
          <p className="text-xs text-primary mb-0.5">AI:</p>
          <p className="text-sm text-foreground line-clamp-4">{aiResponse}</p>
        </div>
      )}

      <div className="fixed bottom-20 left-4 flex flex-col gap-2 z-[100]">
        <Button
          onClick={toggleConnection}
          size="lg"
          disabled={status === 'connecting'}
          className={cn(
            'rounded-full w-16 h-16 shadow-lg transition-all',
            status === 'idle' && 'bg-primary hover:bg-primary/90',
            status === 'connecting' && 'bg-muted',
            status === 'listening' && 'bg-destructive hover:bg-destructive/90 animate-pulse',
            status === 'processing' && 'bg-muted hover:bg-muted/90',
            status === 'speaking' && 'bg-accent hover:bg-accent/90',
            status === 'error' && 'bg-destructive hover:bg-destructive/90',
          )}
        >
          {status === 'connecting' && <Loader2 className="h-6 w-6 animate-spin text-foreground" />}
          {status === 'idle' && <Mic className="h-6 w-6 text-primary-foreground" />}
          {status === 'listening' && <Mic className="h-6 w-6 text-primary-foreground" />}
          {status === 'processing' && <Loader2 className="h-6 w-6 animate-spin text-foreground" />}
          {status === 'speaking' && <Volume2 className="h-6 w-6 text-accent-foreground" />}
          {status === 'error' && <MicOff className="h-6 w-6 text-primary-foreground" />}
        </Button>
      </div>

      {isActive && (status === 'listening' || status === 'speaking') && (
        <div className="fixed bottom-8 left-20 z-[99]">
          <ListeningAnimation isListening={status === 'listening'} isSpeaking={status === 'speaking'} />
        </div>
      )}

      {isActive && (
        <p className="fixed bottom-4 left-4 text-xs text-center font-medium z-[99]">
          {status === 'listening' && '🎤 Listening...'}
          {status === 'processing' && '⚡ Thinking...'}
          {status === 'speaking' && '🔊 Speaking...'}
          {status === 'error' && '❌ Tap to retry'}
        </p>
      )}
    </>
  );
};