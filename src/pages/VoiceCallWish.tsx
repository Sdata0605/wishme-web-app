import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Upload, Loader2, Mic, User, Calendar, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import Header from '@/components/Header';
import { Footer } from '@/components/ui/footer';
import { ServiceGuide } from "@/components/ui/service-guide";
import { voiceCallWishGuide } from "@/data/service-guides";

interface VapiVoice {
  id: string;
  name: string;
  provider?: string;
}

interface UserVoice {
  id: string;
  vapi_voice_id: string;
  voice_name: string;
  created_at: string;
}

const LANGUAGES = [
  { label: 'English', value: 'english' },
  { label: 'Hindi', value: 'hindi' },
  { label: 'Tamil', value: 'tamil' },
  { label: 'Telugu', value: 'telugu' },
  { label: 'Kannada', value: 'kannada' },
  { label: 'Malayalam', value: 'malayalam' },
  { label: 'Marathi', value: 'marathi' },
  { label: 'Bengali', value: 'bengali' },
  { label: 'Gujarati', value: 'gujarati' },
  { label: 'Punjabi', value: 'punjabi' },
];

export default function VoiceCallWish() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { balance: walletBalance } = useWalletBalance();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVoices, setIsFetchingVoices] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [vapiVoices, setVapiVoices] = useState<VapiVoice[]>([]);
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [occasion, setOccasion] = useState('');
  const [language, setLanguage] = useState('english');
  const [selectedVoice, setSelectedVoice] = useState<{ id: string; name: string; provider: string } | null>(null);
  
  // Voice upload state
  const [voiceName, setVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CALL_PRICE = 100;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchVoices();
  }, [user, navigate, authLoading]);

  const fetchVoices = async () => {
    setIsFetchingVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('vapi-get-voices');
      
      if (error) throw error;
      
      setVapiVoices(data.vapiVoices || []);
      setUserVoices(data.userVoices || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load voices. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsFetchingVoices(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an audio file under 10MB',
          variant: 'destructive'
        });
        return;
      }
      setAudioFile(file);
    }
  };

  const handleUploadVoice = async () => {
    if (!voiceName.trim() || !audioFile) {
      toast({
        title: 'Missing information',
        description: 'Please provide a voice name and audio file',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      const { data, error } = await supabase.functions.invoke('vapi-upload-voice', {
        body: { voiceName, audioBase64 }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Voice uploaded!',
        description: `"${voiceName}" has been added to your voices.`
      });

      setVoiceName('');
      setAudioFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh voices
      fetchVoices();
    } catch (error) {
      console.error('Error uploading voice:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload voice',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMakeCall = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !occasion.trim() || !selectedVoice) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields and select a voice',
        variant: 'destructive'
      });
      return;
    }

    if (walletBalance < CALL_PRICE) {
      toast({
        title: 'Insufficient balance',
        description: `You need ₹${CALL_PRICE} in your wallet. Current balance: ₹${walletBalance}`,
        variant: 'destructive'
      });
      navigate('/wallet');
      return;
    }

    const cleanedPhone = recipientPhone.replace(/[\s\-().]/g, '');
    const phoneDigits = cleanedPhone.replace(/^\+?(91)?/, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid 10-digit Indian mobile number starting with 6-9',
        variant: 'destructive'
      });
      return;
    }
    const formattedPhone = '+91' + phoneDigits;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vapi-make-call', {
        body: {
          recipientName,
          recipientPhone: formattedPhone,
          occasion,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          voiceProvider: selectedVoice.provider,
          language,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Call initiated!',
        description: `Calling ${recipientName} to wish them on their ${occasion}!`
      });

      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setOccasion('');
      setSelectedVoice(null);
    } catch (error) {
      console.error('Error making call:', error);
      toast({
        title: 'Call failed',
        description: error instanceof Error ? error.message : 'Failed to initiate call',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <Phone className="inline-block mr-3 h-8 w-8 text-primary" />
              AI Voice Call Wishes
            </h1>
            <p className="text-muted-foreground text-lg">
              Send personalized AI voice calls to wish your loved ones on special occasions
            </p>
          </div>

          <ServiceGuide {...voiceCallWishGuide} className="mb-6" />

          <Tabs defaultValue="make-call" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="make-call">
                <Phone className="h-4 w-4 mr-2" />
                Make a Call
              </TabsTrigger>
              <TabsTrigger value="upload-voice">
                <Upload className="h-4 w-4 mr-2" />
                Upload Voice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="make-call">
              <Card>
                <CardHeader>
                  <CardTitle>Send a Wish Call</CardTitle>
                  <CardDescription>
                    Enter the details and our AI will call your friend to wish them!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">
                        <User className="h-4 w-4 inline mr-2" />
                        Friend's Name
                      </Label>
                      <Input
                        id="recipientName"
                        placeholder="Enter their name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipientPhone">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Phone Number
                      </Label>
                      <Input
                        id="recipientPhone"
                        placeholder="+91 9876543210"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occasion">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Occasion
                    </Label>
                      <Input
                        id="occasion"
                        placeholder="e.g., Birthday, Anniversary, Promotion, Graduation..."
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                      />
                    </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      <Volume2 className="h-4 w-4 inline mr-2" />
                      Select Voice
                    </Label>
                    
                    {isFetchingVoices ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading voices...</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedVoice?.id || ''}
                        onValueChange={(value) => {
                          // Check user voices first
                          const userVoice = userVoices.find(v => v.vapi_voice_id === value);
                          if (userVoice) {
                            setSelectedVoice({
                              id: userVoice.vapi_voice_id,
                              name: userVoice.voice_name,
                              provider: '11labs'
                            });
                            return;
                          }
                          // Then check vapi voices
                          const vapiVoice = vapiVoices.find(v => v.id === value);
                          if (vapiVoice) {
                            setSelectedVoice({
                              id: vapiVoice.id,
                              name: vapiVoice.name,
                              provider: vapiVoice.provider || '11labs'
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a voice for the call" />
                        </SelectTrigger>
                        <SelectContent>
                          {userVoices.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                Your Custom Voices
                              </div>
                              {userVoices.map((voice) => (
                                <SelectItem key={voice.vapi_voice_id} value={voice.vapi_voice_id}>
                                  {voice.voice_name} (Custom)
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {vapiVoices.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                Available Voices
                              </div>
                              {vapiVoices.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {vapiVoices.length === 0 && userVoices.length === 0 && (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No voices available. Upload a custom voice to get started!
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-lg">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-bold text-primary ml-2">₹{CALL_PRICE}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Wallet Balance: ₹{walletBalance}
                    </div>
                  </div>

                  <Button
                    onClick={handleMakeCall}
                    disabled={isLoading || !selectedVoice}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Initiating Call...
                      </>
                    ) : (
                      <>
                        <Phone className="h-5 w-5 mr-2" />
                        Make Wish Call (₹{CALL_PRICE})
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload-voice">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Custom Voice</CardTitle>
                  <CardDescription>
                    Upload an audio sample to create your own custom voice for calls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="voiceName">Voice Name</Label>
                    <Input
                      id="voiceName"
                      placeholder="Give your voice a name"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Audio Sample</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="audioUpload"
                      />
                      <label htmlFor="audioUpload" className="cursor-pointer">
                        <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {audioFile ? audioFile.name : 'Click to upload audio file'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP3, WAV, or M4A (max 10MB)
                        </p>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For best results, upload a clear audio sample of 30 seconds to 2 minutes
                    </p>
                  </div>

                  <Button
                    onClick={handleUploadVoice}
                    disabled={isUploading || !voiceName.trim() || !audioFile}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Uploading Voice...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Voice
                      </>
                    )}
                  </Button>

                  {userVoices.length > 0 && (
                    <div className="pt-6 border-t">
                      <h3 className="font-semibold mb-4">Your Custom Voices</h3>
                      <div className="space-y-2">
                        {userVoices.map((voice) => (
                          <div
                            key={voice.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Volume2 className="h-5 w-5 text-primary" />
                              <span>{voice.voice_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(voice.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
