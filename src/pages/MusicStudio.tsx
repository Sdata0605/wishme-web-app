import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { Music, Sparkles, Loader2, Download, Wallet, Mic, Volume2, Wand2, FileAudio, UserPlus, Image, Play, Pause, Trash2, Upload, SkipBack, SkipForward, Zap, Clock } from "lucide-react";
import AudioRecorderButton from "@/components/media/AudioRecorderButton";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  created_at?: string;
}

interface SavedSong {
  id: string;
  song_title: string;
  status: string;
  song_url: string | null;
  download_url: string | null;
  genre: string | null;
  mood: string | null;
  created_at: string;
  generation_type: string | null;
  duration: number | null;
}

const songPlayUrl = (song: SavedSong) => song.download_url || song.song_url;

// SingingPersona interface removed - now using ElevenLabs cloned voices only

export default function MusicStudio() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("text-to-speech");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Voice Preview State
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // TTS State
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("");
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // Voice Conversion State
  const [stsAudioFile, setStsAudioFile] = useState<File | null>(null);
  const [stsVoice, setStsVoice] = useState("");
  const [isConvertingSts, setIsConvertingSts] = useState(false);
  const [stsAudioUrl, setStsAudioUrl] = useState<string | null>(null);

  // Sound Effects State
  const [sfxDescription, setSfxDescription] = useState("");
  const [sfxDuration, setSfxDuration] = useState([5]);
  const [isGeneratingSfx, setIsGeneratingSfx] = useState(false);
  const [sfxAudioUrl, setSfxAudioUrl] = useState<string | null>(null);

  // Audio Isolation State
  const [isolationAudioFile, setIsolationAudioFile] = useState<File | null>(null);
  const [isIsolating, setIsIsolating] = useState(false);
  const [isolatedAudioUrl, setIsolatedAudioUrl] = useState<string | null>(null);

  // Music Generation State
  const [musicDescription, setMusicDescription] = useState("");
  const [musicGenre, setMusicGenre] = useState("pop");
  const [musicMood, setMusicMood] = useState("happy");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicVoiceType, setMusicVoiceType] = useState<'with_lyrics' | 'instrumental'>('with_lyrics');
  const [musicVoiceGender, setMusicVoiceGender] = useState<'any' | 'male' | 'female'>('any');
  const [musicLanguage, setMusicLanguage] = useState('hindi');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [musicPollingMessage, setMusicPollingMessage] = useState<string | null>(null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const musicPollingRef = useRef<NodeJS.Timeout | null>(null);
  const [savedSongs, setSavedSongs] = useState<SavedSong[]>([]);
  const [loadingSavedSongs, setLoadingSavedSongs] = useState(false);

  // Voice Cloning State
  const [cloneAudioFile, setCloneAudioFile] = useState<File | null>(null);
  const [cloneVoiceName, setCloneVoiceName] = useState("");
  const [cloneVoiceDesc, setCloneVoiceDesc] = useState("");
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);

  // Suno Singing Persona state removed - using ElevenLabs cloned voices for music

  // Image + Music State
  const [imageMusicFile, setImageMusicFile] = useState<File | null>(null);
  const [imageMusicPreview, setImageMusicPreview] = useState<string | null>(null);
  const [imageMusicDesc, setImageMusicDesc] = useState("");
  const [imageMusicLyrics, setImageMusicLyrics] = useState("");
  const [imageMusicGenre, setImageMusicGenre] = useState("ambient");
  const [imageMusicMood, setImageMusicMood] = useState("calm");
  const [imageMusicDuration, setImageMusicDuration] = useState([30]);
  const [imageMusicSource, setImageMusicSource] = useState<'generate' | 'upload'>('generate');
  const [imageMusicAudioFile, setImageMusicAudioFile] = useState<File | null>(null);
  const [isGeneratingImageMusic, setIsGeneratingImageMusic] = useState(false);
  const [imageMusicResult, setImageMusicResult] = useState<{ audioUrl: string; videoUrl?: string; imageBase64: string; hasVocals?: boolean } | null>(null);
  const [isPlayingImageMusic, setIsPlayingImageMusic] = useState(false);
  const imageMusicAudioRef = useRef<HTMLAudioElement>(null);
  const [isGeneratingImageMusicLyrics, setIsGeneratingImageMusicLyrics] = useState(false);
  const [imageMusicLanguage, setImageMusicLanguage] = useState('hindi');
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);

  // Costs
  const TTS_COST = 50;
  const STS_COST = 75;
  const SFX_COST = 60;
  const ISOLATION_COST = 40;
  const MUSIC_COST = 100;
  const FULL_SONG_COST = 150;
  const CLONE_COST = 150;
  const IMAGE_MUSIC_COST = 120;

  useEffect(() => {
    if (profile?.id) {
      supabase.from('profiles').select('wallet_balance').eq('id', profile.id).single()
        .then(({ data }) => data && setWalletBalance(data.wallet_balance || 0));
      fetchVoices();
    }
  }, [profile]);

  // Suno persona polling removed - using ElevenLabs cloned voices which are instant

  // Handle preview audio ended - must be before early return
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      setIsPreviewPlaying(false);
      setPreviewingVoiceId(null);
    };
    
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const fetchSavedSongs = useCallback(async (opts?: { silent?: boolean }) => {
    if (!profile?.id) return;
    if (!opts?.silent) setLoadingSavedSongs(true);
    try {
      const { data, error } = await supabase
        .from('music_generations')
        .select('id, song_title, status, song_url, download_url, genre, mood, created_at, generation_type, duration')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSavedSongs((data || []) as SavedSong[]);
    } catch (err) {
      console.error('Failed to load generated songs:', err);
    } finally {
      if (!opts?.silent) setLoadingSavedSongs(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) fetchSavedSongs();
  }, [profile?.id, fetchSavedSongs]);

  useEffect(() => {
    const stillWorking = savedSongs.some((s) => s.status === 'pending' || s.status === 'processing');
    if (!stillWorking) return;
    const timer = setInterval(() => { fetchSavedSongs({ silent: true }); }, 10000);
    return () => clearInterval(timer);
  }, [savedSongs, fetchSavedSongs]);

  // Cleanup music polling on unmount
  useEffect(() => {
    return () => {
      if (musicPollingRef.current) clearInterval(musicPollingRef.current);
    };
  }, []);

  // Redirect to auth if not logged in - AFTER all hooks
  if (!user) return <Navigate to="/auth" replace />;

  const fetchVoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-user-voices');
      if (error) {
        console.error('Error fetching voices:', error);
        // If auth error (401), fall back to default premade voices without crashing
        const errorStatus = (error as any)?.status || (error as any)?.context?.status;
        if (errorStatus === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.warn('Auth expired for get-user-voices, using default premade voices');
          // Set default premade voices so the page doesn't break
          setVoices([
            { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'premade' },
            { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'premade' },
            { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade' },
            { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'premade' },
            { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade' },
            { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade' },
            { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade' },
            { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade' },
            { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade' },
          ]);
          setClonedVoices([]);
          toast({ title: 'Session may have expired', description: 'Showing default voices. Sign in again to see your cloned voices.', variant: 'destructive' });
          return;
        }
        // Try fallback endpoint for other errors
        const { data: fallbackData } = await supabase.functions.invoke('elevenlabs-get-user-voices');
        if (fallbackData?.voices) {
          setVoices(fallbackData.premadeVoices || fallbackData.voices.filter((v: Voice) => v.category !== 'cloned'));
          setClonedVoices(fallbackData.clonedVoices || []);
        }
        return;
      }
      if (data) {
        setVoices(data.premadeVoices || []);
        setClonedVoices(data.clonedVoices || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching voices:', err);
      // Fallback defaults
      setVoices([
        { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'premade' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade' },
        { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade' },
      ]);
      setClonedVoices([]);
    }
  };

  // fetchSingingPersonas removed - using ElevenLabs cloned voices now

  const updateWallet = async (amount: number) => {
    if (!profile?.id) return false;
    const { error } = await supabase.from('profiles').update({ wallet_balance: walletBalance + amount }).eq('id', profile.id);
    if (!error) setWalletBalance(walletBalance + amount);
    return !error;
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  // Voice Preview Handler
  const handleVoicePreview = async (voiceId: string, previewUrl?: string) => {
    // If same voice is playing, stop it
    if (previewingVoiceId === voiceId && isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPreviewPlaying(false);
      setPreviewingVoiceId(null);
      return;
    }

    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    // Find voice and get preview URL
    const allVoices = [...voices, ...clonedVoices];
    const voice = allVoices.find(v => v.voice_id === voiceId);
    const url = previewUrl || voice?.preview_url;

    if (!url) {
      // Generate a sample preview using TTS if no preview_url
      setPreviewingVoiceId(voiceId);
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-text-to-speech', { 
          body: { text: "Hello! This is how I sound. I hope you like my voice!", voiceId } 
        });
        if (error || !data?.success) {
          const errMsg = data?.error || error?.message || "Couldn't generate voice sample";
          toast({ title: "Preview unavailable", description: errMsg, variant: "destructive" });
          console.error('Voice preview error:', errMsg, 'voiceId:', voiceId);
          setPreviewingVoiceId(null);
          return;
        }
        if (previewAudioRef.current) {
          previewAudioRef.current.src = data.audioUrl;
          await previewAudioRef.current.play();
          setIsPreviewPlaying(true);
        }
      } catch {
        toast({ title: "Preview unavailable", variant: "destructive" });
        setPreviewingVoiceId(null);
      }
      return;
    }

    // Play existing preview URL
    setPreviewingVoiceId(voiceId);
    if (previewAudioRef.current) {
      previewAudioRef.current.src = url;
      try {
        await previewAudioRef.current.play();
        setIsPreviewPlaying(true);
      } catch {
        toast({ title: "Couldn't play preview", variant: "destructive" });
        setPreviewingVoiceId(null);
      }
    }
  };

  // TTS Handler
  const handleTextToSpeech = async () => {
    if (!ttsText.trim() || !ttsVoice) return toast({ title: "Error", description: "Enter text and select voice", variant: "destructive" });
    if (walletBalance < TTS_COST) return toast({ title: "Insufficient Balance", variant: "destructive" });
    setIsGeneratingTts(true); setTtsAudioUrl(null);
    try {
      await updateWallet(-TTS_COST);
      const { data, error } = await supabase.functions.invoke('elevenlabs-text-to-speech', { body: { text: ttsText, voiceId: ttsVoice } });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      setTtsAudioUrl(data.audioUrl);
      
      // Save to database with B2 URL
      const selectedVoice = [...voices, ...clonedVoices].find(v => v.voice_id === ttsVoice);
      await supabase.from('tts_generations').insert({
        user_id: profile?.id,
        text: ttsText.slice(0, 500),
        voice_id: ttsVoice,
        voice_name: selectedVoice?.name || 'Unknown',
        audio_url: data.b2Url || data.audioUrl,
        status: 'completed',
        credits_used: TTS_COST
      });
      
      toast({ title: "Success!", description: "Speech generated!" });
    } catch (e: any) { await updateWallet(TTS_COST); toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setIsGeneratingTts(false); }
  };

  // Voice Conversion Handler
  const handleSpeechToSpeech = async () => {
    if (!stsAudioFile || !stsVoice) return toast({ title: "Error", description: "Upload audio and select voice", variant: "destructive" });
    if (walletBalance < STS_COST) return toast({ title: "Insufficient Balance", variant: "destructive" });
    setIsConvertingSts(true); setStsAudioUrl(null);
    try {
      await updateWallet(-STS_COST);
      const audioBase64 = await fileToBase64(stsAudioFile);
      const { data, error } = await supabase.functions.invoke('elevenlabs-speech-to-speech', { body: { audioBase64, voiceId: stsVoice } });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      setStsAudioUrl(data.audioUrl);
      
      // Save to database
      const selectedVoice = [...voices, ...clonedVoices].find(v => v.voice_id === stsVoice);
      await supabase.from('voice_conversion_generations').insert({
        user_id: profile?.id,
        original_file_name: stsAudioFile.name,
        target_voice_id: stsVoice,
        target_voice_name: selectedVoice?.name || 'Unknown',
        audio_url: data.b2Url || data.audioUrl,
        status: 'completed',
        credits_used: STS_COST
      });
      
      toast({ title: "Success!", description: "Voice converted!" });
    } catch (e: any) { await updateWallet(STS_COST); toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setIsConvertingSts(false); }
  };

  // Sound Effects Handler
  const handleSoundEffects = async () => {
    if (!sfxDescription.trim()) return toast({ title: "Error", description: "Describe the sound", variant: "destructive" });
    if (walletBalance < SFX_COST) return toast({ title: "Insufficient Balance", variant: "destructive" });
    setIsGeneratingSfx(true); setSfxAudioUrl(null);
    try {
      await updateWallet(-SFX_COST);
      const { data, error } = await supabase.functions.invoke('elevenlabs-sound-effects', { body: { text: sfxDescription, durationSeconds: sfxDuration[0] } });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      setSfxAudioUrl(data.audioUrl);
      
      // Save to database
      await supabase.from('sound_effect_generations').insert({
        user_id: profile?.id,
        description: sfxDescription.slice(0, 500),
        duration_seconds: sfxDuration[0],
        audio_url: data.b2Url || data.audioUrl,
        status: 'completed',
        credits_used: SFX_COST
      });
      
      toast({ title: "Success!", description: "Sound generated!" });
    } catch (e: any) { await updateWallet(SFX_COST); toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setIsGeneratingSfx(false); }
  };

  // Audio Isolation Handler
  const handleAudioIsolation = async () => {
    if (!isolationAudioFile) return toast({ title: "Error", description: "Upload audio file", variant: "destructive" });
    if (walletBalance < ISOLATION_COST) return toast({ title: "Insufficient Balance", variant: "destructive" });
    setIsIsolating(true); setIsolatedAudioUrl(null);
    try {
      await updateWallet(-ISOLATION_COST);
      const audioBase64 = await fileToBase64(isolationAudioFile);
      const { data, error } = await supabase.functions.invoke('elevenlabs-audio-isolation', { body: { audioBase64 } });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      setIsolatedAudioUrl(data.audioUrl);
      
      // Save to database
      await supabase.from('audio_isolation_generations').insert({
        user_id: profile?.id,
        original_file_name: isolationAudioFile.name,
        audio_url: data.b2Url || data.audioUrl,
        status: 'completed',
        credits_used: ISOLATION_COST
      });
      
      toast({ title: "Success!", description: "Noise removed!" });
    } catch (e: any) { await updateWallet(ISOLATION_COST); toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setIsIsolating(false); }
  };

  // Generate Lyrics Handler
  const handleGenerateLyrics = async () => {
    if (!musicDescription.trim() && !musicTitle.trim()) return toast({ title: "Error", description: "Enter a description or title first", variant: "destructive" });
    setIsGeneratingLyrics(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: { description: musicDescription || `A song titled "${musicTitle}"`, genre: musicGenre, mood: musicMood, language: musicLanguage }
      });
      let errMsg = data?.error as string | undefined;
      if (error && !errMsg) {
        try { errMsg = (await error.context?.json?.())?.error; } catch { /* ignore */ }
      }
      if (error || !data?.lyrics) throw new Error(errMsg || error?.message || 'Failed to generate lyrics');
      setMusicLyrics(data.lyrics);
      toast({ title: "Success!", description: "Lyrics generated!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsGeneratingLyrics(false); }
  };

  // Music Generation Handler - Uses Suno API via generate-music edge function
  const handleMusicGeneration = async () => {
    if (musicVoiceType === 'with_lyrics' && !musicLyrics.trim()) return toast({ title: "Error", description: "Add lyrics for a full song, or switch to Instrumental", variant: "destructive" });
    if (musicVoiceType === 'instrumental' && !musicDescription.trim()) return toast({ title: "Error", description: "Describe the music you want", variant: "destructive" });
    
    const cost = musicVoiceType === 'with_lyrics' ? FULL_SONG_COST : MUSIC_COST;
    if (walletBalance < cost) return toast({ title: "Insufficient Balance", variant: "destructive" });

    setIsGeneratingMusic(true); 
    setMusicAudioUrl(null);
    setMusicPollingMessage("Submitting your song request...");
    
    try {
      // Call generate-music edge function (handles wallet deduction server-side)
      const { data, error } = await supabase.functions.invoke('generate-music', { 
        body: {
          song_title: musicTitle || 'Untitled Song',
          genre: musicGenre,
          mood: musicMood,
          prompt: musicDescription,
          lyrics: musicVoiceType === 'with_lyrics' ? musicLyrics : undefined,
          generation_type: musicVoiceType === 'with_lyrics' ? 'with_lyrics' : 'instrumental',
          voice_type: musicVoiceGender,
          language: musicLanguage,
        }
      });
      
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to start music generation');
      }

      const { generation_id } = data;
      setMusicPollingMessage("Composing your song... This takes 1-3 minutes");
      
      // Update local wallet (server already deducted)
      setWalletBalance(prev => prev - cost);

      // Start polling check-music-status (now checks Suno)
      const pollStatus = () => {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes at 5s intervals
        const progressMessages = [
          'Submitting your song request...',
          'Composing your song...',
          'Creating the melody...',
          'Adding vocals...',
          'Mixing the track...',
          'Finalizing your song...',
          'Almost ready...',
        ];

        musicPollingRef.current = setInterval(async () => {
          attempts++;
          const msgIndex = Math.min(Math.floor(attempts / 8), progressMessages.length - 1);
          setMusicPollingMessage(progressMessages[msgIndex]);

          if (attempts >= maxAttempts) {
            clearInterval(musicPollingRef.current!);
            musicPollingRef.current = null;
            setMusicPollingMessage(null);
            setIsGeneratingMusic(false);
            toast({ title: "Timeout", description: "Song generation took too long. Your wallet has been refunded.", variant: "destructive" });
            return;
          }

          try {
            const { data: statusData, error: statusError } = await supabase.functions.invoke('check-music-status', {
              body: { generation_id }
            });
            
            if (statusError) {
              console.error('Poll error:', statusError);
              return;
            }
            
            if (statusData?.status === 'completed') {
              clearInterval(musicPollingRef.current!);
              musicPollingRef.current = null;
              setMusicAudioUrl(statusData.download_url || statusData.song_url);
              setMusicPollingMessage(null);
              setIsGeneratingMusic(false);
              fetchSavedSongs();
              toast({ title: "Your song is ready!", description: "Play or download your complete song below." });
            } else if (statusData?.status === 'failed') {
              clearInterval(musicPollingRef.current!);
              musicPollingRef.current = null;
              setMusicPollingMessage(null);
              setIsGeneratingMusic(false);
              toast({ title: "Song generation failed", description: statusData.error || "Please try again. Your wallet has been refunded.", variant: "destructive" });
            } else if (statusData?.message) {
              setMusicPollingMessage(statusData.message);
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 5000);
      };
      
      // Wait 10s before first poll (Suno needs startup time)
      setTimeout(pollStatus, 10000);
      
    } catch (e: any) { 
      setMusicPollingMessage(null);
      setIsGeneratingMusic(false);
      toast({ title: "Error", description: e.message, variant: "destructive" }); 
    }
  };
  
  // Polling cleanup moved to hook block above early return

  // Voice Cloning Handler
  const handleVoiceClone = async () => {
    if (!cloneAudioFile || !cloneVoiceName.trim()) return toast({ title: "Error", description: "Upload voice sample and enter name", variant: "destructive" });
    if (walletBalance < CLONE_COST) return toast({ title: "Insufficient Balance", variant: "destructive" });
    setIsCloningVoice(true); setClonedVoiceId(null);
    try {
      await updateWallet(-CLONE_COST);
      const audioBase64 = await fileToBase64(cloneAudioFile);
      const { data, error } = await supabase.functions.invoke('elevenlabs-clone-voice', { 
        body: { audioBase64, voiceName: cloneVoiceName, voiceDescription: cloneVoiceDesc } 
      });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      setClonedVoiceId(data.voiceId);
      await fetchVoices();
      toast({ title: "Success!", description: "Your voice has been cloned! Use it for TTS and Music generation." });
    } catch (e: any) { await updateWallet(CLONE_COST); toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setIsCloningVoice(false); }
  };

  // Suno persona handlers removed - now using ElevenLabs cloned voices

  // Generate Lyrics for Image+Music
  const handleGenerateImageMusicLyrics = async () => {
    if (!imageMusicDesc.trim()) return toast({ title: "Error", description: "Enter a description first", variant: "destructive" });
    setIsGeneratingImageMusicLyrics(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: { description: imageMusicDesc, genre: imageMusicGenre, mood: imageMusicMood, language: imageMusicLanguage }
      });
      let errMsg = data?.error as string | undefined;
      if (error && !errMsg) {
        try { errMsg = (await error.context?.json?.())?.error; } catch { /* ignore */ }
      }
      if (error || !data?.lyrics) throw new Error(errMsg || error?.message || 'Failed to generate lyrics');
      setImageMusicLyrics(data.lyrics);
      toast({ title: "Success!", description: "Lyrics generated!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsGeneratingImageMusicLyrics(false); }
  };

  // Image + Music Handler
  const handleImageMusic = async () => {
    if (!imageMusicFile) return toast({ title: "Error", description: "Upload an image", variant: "destructive" });
    if (imageMusicSource === 'upload' && !imageMusicAudioFile) return toast({ title: "Error", description: "Upload an audio file", variant: "destructive" });
    if (imageMusicSource === 'generate' && !imageMusicDesc.trim() && !imageMusicLyrics.trim()) return toast({ title: "Error", description: "Enter description or lyrics", variant: "destructive" });
    
    const cost = imageMusicLyrics.trim() ? 150 : IMAGE_MUSIC_COST; // ₹150 with vocals, ₹120 instrumental
    if (walletBalance < cost) return toast({ title: "Insufficient Balance", variant: "destructive" });
    
    setIsGeneratingImageMusic(true); 
    setImageMusicResult(null);
    
    try {
      await updateWallet(-cost);
      const imageBase64 = await fileToBase64(imageMusicFile);
      let uploadedAudioBase64: string | undefined;
      if (imageMusicSource === 'upload' && imageMusicAudioFile) {
        uploadedAudioBase64 = await fileToBase64(imageMusicAudioFile);
      }
      const { data, error } = await supabase.functions.invoke('elevenlabs-image-music-video', { 
        body: { 
          imageBase64, 
          musicDescription: imageMusicDesc, 
          lyrics: imageMusicLyrics, 
          genre: imageMusicGenre, 
          mood: imageMusicMood,
          language: imageMusicLanguage, 
          durationSeconds: imageMusicDuration[0], 
          uploadedAudioBase64
        } 
      });
      if (error || !data?.success) throw new Error(data?.error || 'Failed');
      
      const hasVocals = !!data.hasVocals;
      
      // Save order to database
      if (profile?.id) {
        await supabase.from('image_music_generations').insert({
          user_id: profile.id,
          image_url: data.imageBase64?.substring(0, 200),
          audio_url: data.b2Url || data.audioUrl,
          video_url: data.videoUrl || null,
          description: imageMusicDesc,
          lyrics: imageMusicLyrics || null,
          genre: imageMusicGenre,
          mood: imageMusicMood,
          duration_seconds: imageMusicDuration[0],
          has_vocals: hasVocals,
          amount_charged: cost,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
      
      setImageMusicResult({ 
        audioUrl: data.audioUrl, 
        imageBase64: data.imageBase64, 
        hasVocals: hasVocals
      });
      toast({ title: "Success!", description: hasVocals ? "Your song is ready! Creating video..." : "Your music is ready! Creating video..." });
    } catch (e: any) { 
      await updateWallet(cost); 
      toast({ title: "Error", description: e.message, variant: "destructive" }); 
    }
    finally { setIsGeneratingImageMusic(false); }
  };

  // Create MP4 video from image + audio
  const createVideoFromImageAndAudio = async (): Promise<string> => {
    if (!imageMusicResult) throw new Error('No result available');
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = async () => {
        // Set canvas size to image size (max 1920x1080 for performance)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Create audio element
        const audio = new Audio();
        audio.src = imageMusicResult.audioUrl;
        
        try {
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
          
          // Get audio duration
          const duration = audio.duration || imageMusicDuration[0];
          
          // Create MediaRecorder for video
          const stream = canvas.captureStream(30);
          
          // Create audio context to capture audio
          const audioContext = new AudioContext();
          const response = await fetch(imageMusicResult.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create a destination for recording
          const dest = audioContext.createMediaStreamDestination();
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(dest);
          source.connect(audioContext.destination);
          
          // Combine video and audio streams
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
          });
          
          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            resolve(videoUrl);
          };
          
          // Start recording
          mediaRecorder.start();
          source.start();
          
          // Draw image continuously
          const drawFrame = () => {
            ctx?.drawImage(img, 0, 0, width, height);
          };
          const frameInterval = setInterval(drawFrame, 33); // ~30fps
          
          // Stop after audio duration
          setTimeout(() => {
            clearInterval(frameInterval);
            mediaRecorder.stop();
            source.stop();
            audioContext.close();
          }, duration * 1000);
          
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageMusicResult.imageBase64;
    });
  };

  // Download MP4 video
  const handleDownloadVideo = async () => {
    if (!imageMusicResult) return;
    
    setIsCreatingVideo(true);
    try {
      toast({ title: "Creating Video", description: "Please wait while we create your video..." });
      
      const videoUrl = await createVideoFromImageAndAudio();
      
      // Download the video
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `music-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      URL.revokeObjectURL(videoUrl);
      
      toast({ title: "Downloaded!", description: "Your video has been downloaded" });
    } catch (e: any) {
      console.error('Video creation error:', e);
      toast({ title: "Error", description: "Failed to create video. Downloading audio instead.", variant: "destructive" });
      // Fallback: download audio only
      handleDownload(imageMusicResult.audioUrl, `music-${Date.now()}.mp3`);
    } finally {
      setIsCreatingVideo(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMusicFile(file);
      const reader = new FileReader();
      reader.onload = () => setImageMusicPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleImageMusicPlay = () => {
    if (imageMusicAudioRef.current) {
      if (isPlayingImageMusic) {
        imageMusicAudioRef.current.pause();
      } else {
        imageMusicAudioRef.current.play();
      }
      setIsPlayingImageMusic(!isPlayingImageMusic);
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name.endsWith('.mp3') ? name : `${name}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const AudioResult = ({ url, title }: { url: string | null; title: string }) => url && (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-6 text-center">
        <Volume2 className="h-12 w-12 mx-auto text-primary mb-4" />
        <p className="font-medium mb-4">{title}</p>
        <audio src={url} controls className="w-full mb-4" />
      </div>
      <Button variant="outline" className="w-full" onClick={() => handleDownload(url, `audio-${Date.now()}.mp3`)}>
        <Download className="mr-2 h-4 w-4" />Download
      </Button>
    </div>
  );

  // Waveform bars for the player visualization
  const WaveformBars = ({ playing, progress = 0 }: { playing?: boolean; progress?: number }) => {
    const bars = 28;
    return (
      <div className="flex items-end gap-[2px] h-10 w-full">
        {Array.from({ length: bars }).map((_, i) => {
          const height = 20 + Math.sin(i * 0.8) * 15 + Math.cos(i * 1.2) * 10;
          const filled = i / bars <= progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${
                filled 
                  ? 'bg-gradient-to-t from-[#FF6B33] via-[#EC4899] to-[#B44CFF]' 
                  : 'bg-white/[0.12]'
              }`}
              style={{
                height: `${height}%`,
                animation: playing ? `waveform-breathe 1.5s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#0A0E1A' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <audio ref={audioRef} />
          <audio ref={previewAudioRef} />
          
          {/* Hero Header — left aligned */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-[64px] font-bold leading-[1.1] tracking-tight text-white">
              Your <span className="italic bg-gradient-to-r from-[#FF6B33] to-[#EC4899] bg-clip-text text-transparent">Symphony,</span>
            </h1>
            <h1 className="text-4xl md:text-[64px] font-bold leading-[1.1] tracking-tight text-white">
              Powered by AI.
            </h1>
            <p className="mt-4 text-base text-white/55 max-w-[480px] leading-relaxed">
              Create professional-grade studio tracks from simple lyrics in seconds. The future of music is personalized.
            </p>
          </div>

          {/* Wallet Card */}
          <Card className="mb-8 border-white/[0.08]" style={{ backgroundColor: '#111827' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Wallet className="h-8 w-8 text-[#FF6B33]" />
                  <div>
                    <p className="text-sm text-white/40">Wallet</p>
                    <p className="text-2xl font-bold text-white">₹{walletBalance.toFixed(2)}</p>
                  </div>
                </div>
                  <div className="flex gap-3 text-xs flex-wrap">
                  <div className="text-center px-2"><p className="text-white/40">TTS</p><p className="font-semibold text-[#FF6B33]">₹{TTS_COST}</p></div>
                  <div className="text-center px-2"><p className="text-white/40">Voice</p><p className="font-semibold text-white/70">₹{STS_COST}</p></div>
                  <div className="text-center px-2"><p className="text-white/40">Clone</p><p className="font-semibold text-[#B44CFF]">₹{CLONE_COST}</p></div>
                  <div className="text-center px-2"><p className="text-white/40">Instrumental</p><p className="font-semibold text-white/70">₹{MUSIC_COST}</p></div>
                  <div className="text-center px-2"><p className="text-white/40">Full Song</p><p className="font-semibold text-[#EC4899]">₹{FULL_SONG_COST}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Pill-style tab bar */}
            <div className="relative w-full">
              <div
                className="w-full overflow-x-scroll overflow-y-hidden no-scrollbar pb-2"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
              >
                <div
                  className="inline-flex min-w-max items-center gap-2 rounded-full border border-white/[0.06] p-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <button
                    onClick={() => setActiveTab('music-generation')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'music-generation'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate Song
                  </button>
                  <button
                    onClick={() => setActiveTab('text-to-speech')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'text-to-speech'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5" /> TTS
                  </button>
                  <button
                    onClick={() => setActiveTab('voice-conversion')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'voice-conversion'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" /> Voice Conversion
                  </button>
                  <button
                    onClick={() => setActiveTab('sound-effects')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'sound-effects'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" /> SFX
                  </button>
                  <button
                    onClick={() => setActiveTab('voice-clone')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'voice-clone'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Clone
                  </button>
                  <button
                    onClick={() => setActiveTab('audio-isolation')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'audio-isolation'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <FileAudio className="h-3.5 w-3.5" /> Isolate
                  </button>
                  <button
                    onClick={() => setActiveTab('image-music')}
                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === 'image-music'
                        ? 'bg-[#FF6B33] text-white shadow-[0_2px_12px_rgba(255,107,51,0.3)]'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <Image className="h-3.5 w-3.5" /> Img+Music
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden TabsList for radix state */}
            <TabsList className="hidden">
              <TabsTrigger value="text-to-speech" />
              <TabsTrigger value="voice-conversion" />
              <TabsTrigger value="voice-clone" />
              <TabsTrigger value="sound-effects" />
              <TabsTrigger value="audio-isolation" />
              <TabsTrigger value="music-generation" />
              <TabsTrigger value="image-music" />
            </TabsList>

            {/* Text to Speech Tab */}
            <TabsContent value="text-to-speech">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle><Volume2 className="h-5 w-5 text-primary inline mr-2" />Text to Speech</CardTitle>
                    <CardDescription>Enter text and select a voice</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Your Text *</Label>
                      <Textarea placeholder="Enter text to convert to speech..." value={ttsText} onChange={e => setTtsText(e.target.value)} rows={5} disabled={isGeneratingTts} />
                    </div>
                    <div>
                      <Label>Voice * {clonedVoices.length > 0 && <span className="text-xs text-primary ml-2">({clonedVoices.length} cloned)</span>}</Label>
                      <Select value={ttsVoice} onValueChange={setTtsVoice} disabled={isGeneratingTts}>
                        <SelectTrigger><SelectValue placeholder="Choose voice" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                          {clonedVoices.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-primary">-- Your Cloned Voices --</div>
                              {clonedVoices.map(v => (
                                <div key={v.voice_id} className="flex items-center justify-between px-2 py-1 hover:bg-accent/50 rounded cursor-pointer group">
                                  <SelectItem value={v.voice_id} className="flex-1 p-0">🎤 {v.name}</SelectItem>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.voice_id, v.preview_url); }}
                                  >
                                    {previewingVoiceId === v.voice_id && isPreviewPlaying ? (
                                      <Pause className="h-3 w-3" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-semibold">-- Premade Voices --</div>
                            </>
                          )}
                          {voices.filter(v => v.category !== 'cloned').map(v => (
                            <div key={v.voice_id} className="flex items-center justify-between px-2 py-1 hover:bg-accent/50 rounded cursor-pointer group">
                              <SelectItem value={v.voice_id} className="flex-1 p-0">{v.name}</SelectItem>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.voice_id, v.preview_url); }}
                              >
                                {previewingVoiceId === v.voice_id && isPreviewPlaying ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Hover over a voice and click the play button to preview</p>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleTextToSpeech} disabled={isGeneratingTts || !ttsText || !ttsVoice}>
                      {isGeneratingTts ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate (₹{TTS_COST})</>}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Result</CardTitle></CardHeader>
                  <CardContent>
                    {ttsAudioUrl ? <AudioResult url={ttsAudioUrl} title="Speech Ready!" /> : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Volume2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p>Enter text to generate speech</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Voice Conversion Tab */}
            <TabsContent value="voice-conversion">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle><Mic className="h-5 w-5 text-secondary inline mr-2" />Voice Conversion</CardTitle>
                    <CardDescription>Upload audio and convert to any voice</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Audio File *</Label>
                      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-start mt-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground"><Upload className="h-3 w-3" /> Upload File</div>
                          <Input type="file" accept="audio/*" onChange={e => setStsAudioFile(e.target.files?.[0] || null)} disabled={isConvertingSts} />
                        </div>
                        <div className="flex items-center justify-center sm:pt-5">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">OR</span>
                        </div>
                        <AudioRecorderButton onRecordingComplete={(file) => setStsAudioFile(file)} disabled={isConvertingSts} />
                      </div>
                    </div>
                    <div>
                      <Label>Target Voice *</Label>
                      <Select value={stsVoice} onValueChange={setStsVoice} disabled={isConvertingSts}>
                        <SelectTrigger><SelectValue placeholder="Choose voice" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                          {clonedVoices.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-primary">-- Your Cloned Voices --</div>
                              {clonedVoices.map(v => (
                                <div key={v.voice_id} className="flex items-center justify-between px-2 py-1 hover:bg-accent/50 rounded cursor-pointer group">
                                  <SelectItem value={v.voice_id} className="flex-1 p-0">🎤 {v.name}</SelectItem>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.voice_id, v.preview_url); }}
                                  >
                                    {previewingVoiceId === v.voice_id && isPreviewPlaying ? (
                                      <Pause className="h-3 w-3" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-semibold">-- Premade Voices --</div>
                            </>
                          )}
                          {voices.filter(v => v.category !== 'cloned').map(v => (
                            <div key={v.voice_id} className="flex items-center justify-between px-2 py-1 hover:bg-accent/50 rounded cursor-pointer group">
                              <SelectItem value={v.voice_id} className="flex-1 p-0">{v.name}</SelectItem>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.voice_id, v.preview_url); }}
                              >
                                {previewingVoiceId === v.voice_id && isPreviewPlaying ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Hover over a voice and click the play button to preview</p>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleSpeechToSpeech} disabled={isConvertingSts || !stsAudioFile || !stsVoice}>
                      {isConvertingSts ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Converting...</> : <><Mic className="mr-2 h-4 w-4" />Convert (₹{STS_COST})</>}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Result</CardTitle></CardHeader>
                  <CardContent>
                    {stsAudioUrl ? <AudioResult url={stsAudioUrl} title="Converted Voice Ready!" /> : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Mic className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p>Upload audio to convert</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Voice Clone Tab - Now includes Singing Persona */}
            <TabsContent value="voice-clone">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Clone Voice for Speech (ElevenLabs) */}
                <Card>
                  <CardHeader>
                    <CardTitle><UserPlus className="h-5 w-5 text-accent inline mr-2" />Clone Voice (for Speech)</CardTitle>
                    <CardDescription>Clone your voice for TTS and voice conversion</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Voice Sample (1-5 min recommended) *</Label>
                      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-start mt-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground"><Upload className="h-3 w-3" /> Upload File</div>
                          <Input type="file" accept="audio/*" onChange={e => setCloneAudioFile(e.target.files?.[0] || null)} disabled={isCloningVoice} />
                        </div>
                        <div className="flex items-center justify-center sm:pt-5">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">OR</span>
                        </div>
                        <AudioRecorderButton onRecordingComplete={(file) => setCloneAudioFile(file)} disabled={isCloningVoice} />
                      </div>
                    </div>
                    <div>
                      <Label>Voice Name *</Label>
                      <Input placeholder="My Voice" value={cloneVoiceName} onChange={e => setCloneVoiceName(e.target.value)} disabled={isCloningVoice} />
                    </div>
                    <div>
                      <Label>Description (Optional)</Label>
                      <Input placeholder="A warm, friendly voice" value={cloneVoiceDesc} onChange={e => setCloneVoiceDesc(e.target.value)} disabled={isCloningVoice} />
                    </div>
                    <Button className="w-full" size="lg" onClick={handleVoiceClone} disabled={isCloningVoice || !cloneAudioFile || !cloneVoiceName}>
                      {isCloningVoice ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cloning...</> : <><UserPlus className="mr-2 h-4 w-4" />Clone Voice (₹{CLONE_COST})</>}
                    </Button>
                    {clonedVoices.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-sm font-semibold mb-2 block">Your Cloned Voices</Label>
                        <div className="space-y-2">
                          {clonedVoices.map(v => (
                            <div key={v.voice_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <UserPlus className="h-5 w-5 text-accent" />
                              <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">Ready to use</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Voice cloning info card */}
                <Card className="bg-gradient-to-br from-secondary/5 to-primary/5 border-secondary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-secondary" />
                      Use Your Voice for Music
                    </CardTitle>
                    <CardDescription>Your cloned voice works for both TTS and AI Music</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-background/80 border border-dashed">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-secondary/10">
                          <Sparkles className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">How It Works</h4>
                          <ol className="text-sm text-muted-foreground space-y-2">
                            <li className="flex gap-2"><span className="font-semibold text-primary">1.</span> Clone your voice using the form on the left</li>
                            <li className="flex gap-2"><span className="font-semibold text-primary">2.</span> Go to the Music tab and select "My Cloned Voice"</li>
                            <li className="flex gap-2"><span className="font-semibold text-primary">3.</span> Add lyrics and generate your personalized song!</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    {clonedVoices.length > 0 ? (
                      <div className="p-3 rounded-lg bg-accent/20 border border-accent/30">
                        <p className="text-sm text-accent-foreground flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          ✓ You have {clonedVoices.length} cloned voice{clonedVoices.length > 1 ? 's' : ''} ready for music!
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">
                          Clone your voice first to use it for music generation.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sound Effects Tab */}
            <TabsContent value="sound-effects">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle><Wand2 className="h-5 w-5 text-accent inline mr-2" />Sound Effects</CardTitle>
                    <CardDescription>Describe any sound you want</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Description *</Label>
                      <Textarea placeholder="Thunder, rain, birds chirping..." value={sfxDescription} onChange={e => setSfxDescription(e.target.value)} rows={4} disabled={isGeneratingSfx} />
                    </div>
                    <div>
                      <Label>Duration: {sfxDuration[0]}s</Label>
                      <Slider value={sfxDuration} onValueChange={setSfxDuration} min={1} max={22} step={1} disabled={isGeneratingSfx} className="mt-2" />
                    </div>
                    <Button className="w-full" size="lg" onClick={handleSoundEffects} disabled={isGeneratingSfx || !sfxDescription}>
                      {isGeneratingSfx ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Wand2 className="mr-2 h-4 w-4" />Generate (₹{SFX_COST})</>}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Result</CardTitle></CardHeader>
                  <CardContent>
                    {sfxAudioUrl ? <AudioResult url={sfxAudioUrl} title="Sound Effect Ready!" /> : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p>Describe a sound to generate</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Audio Isolation Tab */}
            <TabsContent value="audio-isolation">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle><FileAudio className="h-5 w-5 text-primary inline mr-2" />Audio Isolation</CardTitle>
                    <CardDescription>Remove background noise from audio</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Audio File *</Label>
                      <Input type="file" accept="audio/*" onChange={e => setIsolationAudioFile(e.target.files?.[0] || null)} disabled={isIsolating} />
                    </div>
                    <Button className="w-full" size="lg" onClick={handleAudioIsolation} disabled={isIsolating || !isolationAudioFile}>
                      {isIsolating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><FileAudio className="mr-2 h-4 w-4" />Remove Noise (₹{ISOLATION_COST})</>}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Result</CardTitle></CardHeader>
                  <CardContent>
                    {isolatedAudioUrl ? <AudioResult url={isolatedAudioUrl} title="Clean Audio Ready!" /> : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileAudio className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p>Upload audio to isolate vocals</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Music Generation Tab - Redesigned */}
            <TabsContent value="music-generation">
              <div className="grid lg:grid-cols-[55fr_45fr] gap-6">
                {/* LEFT COLUMN — Input Form */}
                <div className="rounded-[20px] border border-white/[0.08] p-7" style={{ backgroundColor: '#111827' }}>
                  {/* Song Title Row */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium">Song Title</span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full border" style={{
                      backgroundColor: 'rgba(255,107,51,0.15)',
                      borderColor: 'rgba(255,107,51,0.3)',
                      color: '#FF6B33',
                    }}>
                      {musicVoiceType === 'with_lyrics' ? `Full Song — ₹${FULL_SONG_COST}` : `Instrumental — ₹${MUSIC_COST}`}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="The Midnight Gala"
                    value={musicTitle}
                    onChange={e => setMusicTitle(e.target.value)}
                    disabled={isGeneratingMusic}
                    className="w-full bg-transparent border-0 border-b border-white/10 text-white text-lg font-normal py-3 px-0 focus:outline-none focus:border-white/30 placeholder:text-white/20 transition-colors"
                  />

                  {/* Song Type Toggle */}
                  <div className="mt-6 mb-4 flex gap-2">
                    <button
                      onClick={() => setMusicVoiceType('with_lyrics')}
                      disabled={isGeneratingMusic}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                        musicVoiceType === 'with_lyrics'
                          ? 'bg-[#FF6B33] border-[#FF6B33] text-white'
                          : 'bg-transparent border-white/12 text-white/70 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Full Song
                    </button>
                    <button
                      onClick={() => setMusicVoiceType('instrumental')}
                      disabled={isGeneratingMusic}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                        musicVoiceType === 'instrumental'
                          ? 'bg-[#FF6B33] border-[#FF6B33] text-white'
                          : 'bg-transparent border-white/12 text-white/70 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Instrumental
                    </button>
                  </div>

                  {/* Voice & Language (only for full song) */}
                  {musicVoiceType === 'with_lyrics' && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div>
                        <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium block mb-2">Voice</span>
                        <Select value={musicVoiceGender} onValueChange={(v) => setMusicVoiceGender(v as any)} disabled={isGeneratingMusic}>
                          <SelectTrigger className="bg-[#0D1117] border-white/[0.06] text-white/80 rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Voice</SelectItem>
                            <SelectItem value="male">Male Voice</SelectItem>
                            <SelectItem value="female">Female Voice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium block mb-2">Language</span>
                        <Select value={musicLanguage} onValueChange={setMusicLanguage} disabled={isGeneratingMusic}>
                          <SelectTrigger className="bg-[#0D1117] border-white/[0.06] text-white/80 rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="hindi">Hindi</SelectItem>
                            <SelectItem value="tamil">Tamil</SelectItem>
                            <SelectItem value="telugu">Telugu</SelectItem>
                            <SelectItem value="kannada">Kannada</SelectItem>
                            <SelectItem value="malayalam">Malayalam</SelectItem>
                            <SelectItem value="punjabi">Punjabi</SelectItem>
                            <SelectItem value="bengali">Bengali</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Lyrics Textarea (for full song) */}
                  {musicVoiceType === 'with_lyrics' && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium">Monospace Lyrics</span>
                        <button
                          onClick={handleGenerateLyrics}
                          disabled={isGeneratingLyrics}
                          className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20"
                        >
                          {isGeneratingLyrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Generate Lyrics</>}
                        </button>
                      </div>
                      <textarea
                        placeholder={"[Verse 1]\nIn the neon glow of the night...\n[Chorus]\nWish me a star, wish me a light..."}
                        value={musicLyrics}
                        onChange={e => setMusicLyrics(e.target.value)}
                        disabled={isGeneratingMusic}
                        className="w-full min-h-[140px] resize-y rounded-xl p-4 text-[13px] leading-[1.7] text-white/80 placeholder:text-white/20 border border-white/[0.06] focus:outline-none focus:border-white/20 transition-colors"
                        style={{ backgroundColor: '#0D1117', fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
                      />
                    </div>
                  )}

                  {/* Description (for instrumental) */}
                  {musicVoiceType === 'instrumental' && (
                    <div className="mb-5">
                      <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium block mb-2">Description</span>
                      <textarea
                        placeholder="Describe the music: upbeat summer song with guitar, piano melody..."
                        value={musicDescription}
                        onChange={e => setMusicDescription(e.target.value)}
                        disabled={isGeneratingMusic}
                        className="w-full min-h-[100px] resize-y rounded-xl p-4 text-sm text-white/80 placeholder:text-white/20 border border-white/[0.06] focus:outline-none focus:border-white/20 transition-colors"
                        style={{ backgroundColor: '#0D1117' }}
                      />
                    </div>
                  )}

                  {/* Genre & Mood Pills */}
                  <div className="mb-6">
                    <span className="text-[10px] uppercase tracking-[2px] text-white/40 font-medium block mb-3">Genre & Mood</span>
                    <div className="flex flex-wrap gap-2">
                      {['bollywood', 'pop', 'romantic', 'happy', 'lofi', 'classical', 'hip-hop', 'r&b', 'edm', 'folk'].map(pill => {
                        const isGenre = ['bollywood', 'pop', 'classical', 'hip-hop', 'r&b', 'edm', 'folk'].includes(pill);
                        const isSelected = isGenre ? musicGenre === pill : musicMood === pill;
                        return (
                          <button
                            key={pill}
                            onClick={() => isGenre ? setMusicGenre(pill) : setMusicMood(pill)}
                            disabled={isGeneratingMusic}
                            className={`px-[18px] py-2 rounded-full text-[13px] border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF6B33] border-[#FF6B33] text-white font-medium'
                                : 'bg-transparent border-white/12 text-white/70 hover:border-white/30 hover:text-white'
                            }`}
                          >
                            {pill.charAt(0).toUpperCase() + pill.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleMusicGeneration}
                    disabled={isGeneratingMusic || (musicVoiceType === 'with_lyrics' ? !musicLyrics.trim() : !musicDescription.trim())}
                    className="w-full h-[52px] rounded-xl text-[15px] font-semibold tracking-wide text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:shadow-[0_8px_30px_rgba(255,107,51,0.35)] hover:-translate-y-px active:translate-y-0 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    style={{ background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)' }}
                  >
                    {isGeneratingMusic ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> COMPOSING...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> GENERATE TRACK</>
                    )}
                  </button>
                </div>

                {/* RIGHT COLUMN — Player / Preview */}
                <div className="rounded-[20px] border border-white/[0.08] p-7 flex flex-col items-center text-center" style={{ backgroundColor: '#111827' }}>
                  {isGeneratingMusic && musicPollingMessage ? (
                    /* Loading / Processing State */
                    <div className="flex-1 flex flex-col items-center justify-center py-8 w-full">
                      {/* Background waveform animation */}
                      <div className="w-full opacity-20 mb-8">
                        <WaveformBars playing={true} progress={0.5} />
                      </div>
                      {/* Spinner */}
                      <div className="relative w-12 h-12 mb-6">
                        <div
                          className="w-12 h-12 rounded-full animate-spin"
                          style={{
                            border: '3px solid transparent',
                            borderTopColor: '#FF6B33',
                            borderRightColor: '#B44CFF',
                          }}
                        />
                      </div>
                      <p className="text-base font-medium text-white mb-1">Composing your melody...</p>
                      <p className="text-[13px] text-white/50">{musicPollingMessage}</p>
                    </div>
                  ) : musicAudioUrl ? (
                    /* Completed State — Real Player */
                    <div className="flex-1 flex flex-col items-center justify-center w-full gap-5">
                      {/* Album art */}
                      <div
                        className="w-[220px] h-[220px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                        style={{ background: 'linear-gradient(135deg, #FF6B33, #EC4899, #B44CFF)' }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-20 w-20 text-white/80" />
                        </div>
                      </div>
                      {/* Track info */}
                      <div>
                        <h3 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {musicTitle || 'Your Song'}
                        </h3>
                        <p className="text-sm italic text-white/50 mt-1">WishMe AI</p>
                      </div>
                      {/* Audio player */}
                      <div className="w-full">
                        <audio
                          src={musicAudioUrl}
                          controls
                          className="w-full rounded-lg"
                          style={{
                            filter: 'invert(1)',
                            borderRadius: '12px',
                          }}
                        />
                      </div>
                      {/* Download button */}
                      <button
                        onClick={() => handleDownload(musicAudioUrl, `${musicTitle || 'song'}-${Date.now()}.mp3`)}
                        className="w-full py-3 rounded-xl text-sm font-medium text-white/70 border border-white/[0.15] hover:border-white/30 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" /> Download MP3
                      </button>
                    </div>
                  ) : (
                    /* Default / Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center w-full gap-5 py-4">
                      {/* Placeholder album art */}
                      <div
                        className="w-[220px] h-[220px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                        style={{ background: 'linear-gradient(135deg, #FF6B33 0%, #EC4899 50%, #B44CFF 100%)' }}
                      >
                        <div className="w-full h-full flex items-center justify-center backdrop-blur-sm bg-black/10">
                          <Music className="h-20 w-20 text-white/60" />
                        </div>
                      </div>
                      {/* Track info placeholder */}
                      <div>
                        <h3 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                          Preview Generation
                        </h3>
                        <p className="text-sm italic text-white/50 mt-1">Curating your emotional soundscape...</p>
                      </div>
                      {/* Waveform visualization */}
                      <div className="w-full px-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] text-white/40" style={{ fontFamily: 'monospace' }}>01:42</span>
                          <span className="text-[13px] text-white/40" style={{ fontFamily: 'monospace' }}>03:20</span>
                        </div>
                        <WaveformBars progress={0.4} />
                      </div>
                      {/* Controls */}
                      <div className="flex items-center gap-6">
                        <button className="text-white/50 hover:text-white transition-colors">
                          <SkipBack className="h-7 w-7" />
                        </button>
                        <button className="w-[52px] h-[52px] rounded-full bg-white flex items-center justify-center shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-[0.97] transition-transform">
                          <Play className="h-6 w-6 text-[#0A0E1A] ml-0.5" />
                        </button>
                        <button className="text-white/50 hover:text-white transition-colors">
                          <SkipForward className="h-7 w-7" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved songs — persist after leaving the page */}
              <div className="mt-8 rounded-[20px] border border-white/[0.08] p-6 md:p-7" style={{ backgroundColor: '#111827' }}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Your Generated Songs
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                      Play or download songs you have already created. They stay here when you come back.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchSavedSongs()}
                    disabled={loadingSavedSongs}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loadingSavedSongs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
                  </button>
                </div>

                {loadingSavedSongs && savedSongs.length === 0 ? (
                  <div className="py-10 text-center text-white/50">
                    <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-[#FF6B33]" />
                    Loading your songs...
                  </div>
                ) : savedSongs.length === 0 ? (
                  <div className="py-10 text-center text-white/45">
                    <Music className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p>No songs yet</p>
                    <p className="text-sm mt-1 text-white/35">Generate a track above and it will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedSongs.map((song) => {
                      const url = songPlayUrl(song);
                      const canPlay = song.status === 'completed' && !!url;
                      const fileName = `${(song.song_title || 'song').replace(/[^\w\s-]/g, '').trim() || 'song'}.mp3`;
                      return (
                        <div
                          key={song.id}
                          className="rounded-2xl border border-white/[0.06] p-4 md:p-5"
                          style={{ backgroundColor: '#0D1117' }}
                        >
                          <div className="flex items-start gap-3 md:gap-4">
                            <button
                              type="button"
                              disabled={!canPlay}
                              onClick={() => {
                                if (!url) return;
                                setMusicAudioUrl(url);
                                setMusicTitle(song.song_title || 'Your Song');
                              }}
                              className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #FF6B33, #EC4899, #B44CFF)' }}
                              title={canPlay ? 'Play in preview' : undefined}
                            >
                              <Music className="h-6 w-6 text-white/90" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate">{song.song_title || 'Untitled Song'}</p>
                                  <p className="text-xs text-white/45 mt-0.5 truncate">
                                    {[song.generation_type === 'with_lyrics' ? 'Full song' : song.generation_type === 'instrumental' ? 'Instrumental' : null, song.genre, song.mood]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                <span className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                  song.status === 'completed'
                                    ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                                    : song.status === 'failed'
                                      ? 'text-red-300 border-red-400/30 bg-red-400/10'
                                      : 'text-sky-300 border-sky-400/30 bg-sky-400/10'
                                }`}>
                                  {song.status === 'processing' || song.status === 'pending' ? 'Processing' : song.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-white/40">
                                <Clock className="h-3 w-3" />
                                {new Date(song.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                              {canPlay && (
                                <div className="mt-3 space-y-2">
                                  <audio controls preload="none" className="w-full h-10" src={url!} />
                                  <button
                                    type="button"
                                    onClick={() => handleDownload(url!, fileName)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium text-white/70 border border-white/[0.15] hover:border-white/30 hover:text-white transition-all inline-flex items-center justify-center gap-2"
                                  >
                                    <Download className="h-4 w-4" /> Download MP3
                                  </button>
                                </div>
                              )}
                              {(song.status === 'processing' || song.status === 'pending') && (
                                <p className="text-xs text-white/45 mt-2 flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Still composing — this list will update automatically.
                                </p>
                              )}
                              {song.status === 'failed' && (
                                <p className="text-xs text-red-300/80 mt-2">Generation failed. Your wallet was refunded.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Image + Music Tab */}
            <TabsContent value="image-music">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle><Image className="h-5 w-5 text-accent inline mr-2" />Image + Music Video</CardTitle>
                    <CardDescription>Create a music video from your image with optional vocals</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Upload Image *</Label>
                      <Input type="file" accept="image/*" onChange={handleImageSelect} disabled={isGeneratingImageMusic} />
                      {imageMusicPreview && (
                        <div className="mt-2 rounded-lg overflow-hidden max-w-48">
                          <img src={imageMusicPreview} alt="Preview" className="w-full h-auto" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Music Source</Label>
                      <Select value={imageMusicSource} onValueChange={(v) => setImageMusicSource(v as any)} disabled={isGeneratingImageMusic}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generate">Generate AI Music</SelectItem>
                          <SelectItem value="upload">Upload My Audio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {imageMusicSource === 'generate' ? (
                      <>
                        <div>
                          <Label>Music Description</Label>
                          <Textarea placeholder="Calming piano melody, upbeat pop song..." value={imageMusicDesc} onChange={e => setImageMusicDesc(e.target.value)} rows={2} disabled={isGeneratingImageMusic} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Genre</Label>
                            <Select value={imageMusicGenre} onValueChange={setImageMusicGenre} disabled={isGeneratingImageMusic}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ambient">Ambient</SelectItem>
                                <SelectItem value="pop">Pop</SelectItem>
                                <SelectItem value="classical">Classical</SelectItem>
                                <SelectItem value="electronic">Electronic</SelectItem>
                                <SelectItem value="rock">Rock</SelectItem>
                                <SelectItem value="r&b">R&B</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Mood</Label>
                            <Select value={imageMusicMood} onValueChange={setImageMusicMood} disabled={isGeneratingImageMusic}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="calm">Calm</SelectItem>
                                <SelectItem value="happy">Happy</SelectItem>
                                <SelectItem value="romantic">Romantic</SelectItem>
                                <SelectItem value="epic">Epic</SelectItem>
                                <SelectItem value="sad">Sad</SelectItem>
                                <SelectItem value="energetic">Energetic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Language</Label>
                            <Select value={imageMusicLanguage} onValueChange={setImageMusicLanguage} disabled={isGeneratingImageMusic}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="hindi">Hindi</SelectItem>
                                <SelectItem value="tamil">Tamil</SelectItem>
                                <SelectItem value="telugu">Telugu</SelectItem>
                                <SelectItem value="kannada">Kannada</SelectItem>
                                <SelectItem value="malayalam">Malayalam</SelectItem>
                                <SelectItem value="punjabi">Punjabi</SelectItem>
                                <SelectItem value="bengali">Bengali</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Lyrics Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Lyrics (for vocals)</Label>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleGenerateImageMusicLyrics} 
                              disabled={isGeneratingImageMusicLyrics || !imageMusicDesc.trim()}
                            >
                              {isGeneratingImageMusicLyrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3 mr-1" />Generate Lyrics</>}
                            </Button>
                          </div>
                          <Textarea 
                            placeholder="Leave empty for instrumental only, or add lyrics for a song with vocals..." 
                            value={imageMusicLyrics} 
                            onChange={e => setImageMusicLyrics(e.target.value)} 
                            rows={5} 
                            disabled={isGeneratingImageMusic}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">💡 Add lyrics to create a song with AI-generated vocals. Leave empty for instrumental only.</p>
                        </div>

                        <div>
                          <Label>Duration: {imageMusicDuration[0]}s</Label>
                          <Slider value={imageMusicDuration} onValueChange={setImageMusicDuration} min={10} max={60} step={5} disabled={isGeneratingImageMusic} className="mt-2" />
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label>Upload Audio File *</Label>
                        <Input type="file" accept="audio/*" onChange={e => setImageMusicAudioFile(e.target.files?.[0] || null)} disabled={isGeneratingImageMusic} />
                      </div>
                    )}
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-accent" 
                      size="lg" 
                      onClick={handleImageMusic} 
                      disabled={isGeneratingImageMusic || !imageMusicFile || (imageMusicSource === 'upload' && !imageMusicAudioFile) || (imageMusicSource === 'generate' && !imageMusicDesc && !imageMusicLyrics)}
                    >
                      {isGeneratingImageMusic ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Song...</>
                      ) : (
                        <><Image className="mr-2 h-4 w-4" />Create Video (₹{imageMusicLyrics.trim() ? 150 : IMAGE_MUSIC_COST})</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Result</CardTitle></CardHeader>
                  <CardContent>
                    {imageMusicResult ? (
                      <div className="space-y-4">
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={imageMusicResult.imageBase64} alt="Video" className="w-full" />
                          <audio ref={imageMusicAudioRef} src={imageMusicResult.audioUrl} onEnded={() => setIsPlayingImageMusic(false)} />
                          <button onClick={toggleImageMusicPlay} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                            {isPlayingImageMusic ? <Pause className="h-16 w-16 text-white" /> : <Play className="h-16 w-16 text-white" />}
                          </button>
                        </div>
                        {imageMusicResult.hasVocals && (
                          <p className="text-center text-sm text-primary font-medium">🎤 Song with AI Vocals</p>
                        )}
                        <Button 
                          className="w-full bg-gradient-to-r from-primary to-accent" 
                          onClick={handleDownloadVideo}
                          disabled={isCreatingVideo}
                        >
                          {isCreatingVideo ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Video...</>
                          ) : (
                            <><Download className="mr-2 h-4 w-4" />Download Video (MP4)</>
                          )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">Downloads your image + music as a video file</p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Image className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p>Upload image to create video</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
