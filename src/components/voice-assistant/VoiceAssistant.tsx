import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from '@/utils/VoiceAssistant';
import { ListeningAnimation } from './ListeningAnimation';
import { WaveformVisualizer } from './WaveformVisualizer';

export const VoiceAssistant = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    audioQueueRef.current = new AudioQueue(audioContextRef.current);

    return () => {
      disconnect();
      audioContextRef.current?.close();
    };
  }, []);

  const connect = async () => {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to WebSocket
      const ws = new WebSocket('wss://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/voice-assistant');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast.success('Voice assistant connected');
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data.type);

        if (data.type === 'response.audio.delta') {
          setIsSpeaking(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await audioQueueRef.current?.addToQueue(bytes);
        } else if (data.type === 'response.audio.done') {
          setIsSpeaking(false);
        } else if (data.type === 'input_audio_buffer.speech_started') {
          setIsListening(true);
        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          setIsListening(false);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsSpeaking(false);
        setIsListening(false);
        toast.info('Voice assistant disconnected');
      };

      // Start recording
      recorderRef.current = new AudioRecorder((audioData) => {
        if (ws.readyState === WebSocket.OPEN) {
          const encoded = encodeAudioForAPI(audioData);
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encoded
          }));
          
          // Update audio level for visualizer
          const level = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
          setAudioLevel(Math.min(1, level * 5));
        }
      });

      await recorderRef.current.start();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect voice assistant');
    }
  };

  const disconnect = () => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);
  };

  return (
    <div className="fixed bottom-6 right-24 z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Waveform Visualizer */}
        {isConnected && (
          <WaveformVisualizer 
            isActive={isListening} 
            audioLevel={audioLevel}
            className="mb-2"
          />
        )}

        <div className="relative">
          {/* Listening Animation */}
          <ListeningAnimation 
            isListening={isListening}
            isSpeaking={isSpeaking}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Status Indicator */}
          {isConnected && (
            <div className="absolute -top-2 -right-2 z-10">
              {isSpeaking ? (
                <div className="bg-chart-2 rounded-full p-1.5 animate-pulse">
                  <Volume2 className="h-3 w-3 text-white" />
                </div>
              ) : isListening ? (
                <div className="bg-primary rounded-full p-1.5 animate-pulse">
                  <Mic className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="bg-muted rounded-full w-3 h-3 animate-pulse" />
              )}
            </div>
          )}

          {/* Main Button */}
          <Button
            size="lg"
            onClick={isConnected ? disconnect : connect}
            className={`relative h-16 w-16 rounded-full shadow-xl transition-all ${
              isConnected 
                ? 'bg-destructive hover:bg-destructive/90' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isConnected ? (
              <MicOff className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </Button>

          {/* Status Text */}
          {isConnected && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs font-medium shadow-lg">
                {isSpeaking ? (
                  <span className="text-chart-2 flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" />
                    AI Speaking...
                  </span>
                ) : isListening ? (
                  <span className="text-primary flex items-center gap-1.5">
                    <Mic className="h-3 w-3" />
                    Listening...
                  </span>
                ) : (
                  <span className="text-muted-foreground">Ready</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
