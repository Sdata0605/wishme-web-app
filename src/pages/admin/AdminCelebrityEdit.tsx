import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, Upload, Music, Image as ImageIcon, Video, Trash2, Edit, 
  Plus, Star, CheckCircle, XCircle, MapPin, Users, IndianRupee, ArrowLeft, Phone, Loader2, Check, AlertCircle
} from "lucide-react";

interface CelebrityData {
  id: string;
  name: string;
  category: string;
  bio?: string;
  image_url?: string;
  service_prices: any;
  delivery_time: string;
  followers?: string;
  location?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  commission_percentage: number;
  total_earnings: number;
  available_balance: number;
  date_of_birth?: string;
  anniversary_date?: string;
  other_occasions?: string;
  verification_status: string;
  created_at: string;
  vapi_voice_id?: string;
  voice_call_price?: number;
  vapi_phone_id?: string;
  webhook_url?: string;
  consent_status?: string;
  consent_photo_url?: string;
  consent_video_url?: string;
  consent_given_at?: string;
}

interface Category {
  id: string;
  name: string;
}

interface CelebrityEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type: string;
  location?: string;
  is_public: boolean;
}

interface CelebrityMedia {
  id: string;
  title: string;
  description?: string;
  media_type: string;
  file_url: string;
  thumbnail_url?: string;
  is_avatar_content: boolean;
  is_promotional: boolean;
  consent_recorded: boolean;
  is_public: boolean;
}

export default function AdminCelebrityEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [celebrity, setCelebrity] = useState<CelebrityData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CelebrityEvent[]>([]);
  const [media, setMedia] = useState<CelebrityMedia[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CelebrityEvent | null>(null);
  
  // Voice verification state
  const [verifyingVoice, setVerifyingVoice] = useState(false);
  const [voiceVerified, setVoiceVerified] = useState<boolean | null>(null);
  const [voiceVerificationError, setVoiceVerificationError] = useState<string | null>(null);
  const [verifiedVoiceName, setVerifiedVoiceName] = useState<string | null>(null);
  
  // HeyGen avatars and voices state
  const [heygenAvatars, setHeygenAvatars] = useState<Array<{ avatar_id: string; avatar_name: string; preview_image_url?: string }>>([]);
  const [heygenVoices, setHeygenVoices] = useState<Array<{ voice_id: string; voice_name: string; language?: string }>>([]);
  const [loadingHeygenAvatars, setLoadingHeygenAvatars] = useState(false);
  const [loadingHeygenVoices, setLoadingHeygenVoices] = useState(false);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_type: "premiere",
    location: "",
    is_public: true
  });

  const [mediaForm, setMediaForm] = useState({
    title: "",
    description: "",
    media_type: "image",
    is_avatar_content: false,
    is_promotional: false,
    consent_recorded: false,
    is_public: false
  });
  
  // Voice ID verification function
  const verifyVoiceId = async () => {
    const voiceId = (celebrity as any)?.vapi_voice_id;
    if (!voiceId || voiceId.trim() === '') {
      setVoiceVerificationError('Please enter a Voice ID first');
      setVoiceVerified(false);
      return;
    }

    setVerifyingVoice(true);
    setVoiceVerified(null);
    setVoiceVerificationError(null);
    setVerifiedVoiceName(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-elevenlabs-voice', {
        body: { voiceId: voiceId.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setVoiceVerified(true);
        setVerifiedVoiceName(data.name || 'Voice verified');
        toast({
          title: "Voice Verified",
          description: `Voice "${data.name}" (${data.category || 'unknown'}) is valid and ready to use.`
        });
      } else {
        setVoiceVerified(false);
        setVoiceVerificationError(data?.error || 'Voice ID not found. Please check and try again.');
        toast({
          title: "Invalid Voice ID",
          description: data?.error || "This Voice ID does not exist in ElevenLabs.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Voice verification error:', error);
      setVoiceVerified(false);
      setVoiceVerificationError('Failed to verify Voice ID. Please check your connection.');
    } finally {
      setVerifyingVoice(false);
    }
  };
  
  // Reset verification when voice ID changes
  const handleVoiceIdChange = (value: string) => {
    updateField('vapi_voice_id' as keyof CelebrityData, value);
    setVoiceVerified(null);
    setVoiceVerificationError(null);
    setVerifiedVoiceName(null);
  };

  // Fetch HeyGen avatars
  const fetchHeygenAvatars = async () => {
    setLoadingHeygenAvatars(true);
    try {
      const { data, error } = await supabase.functions.invoke('heygen-get-avatars');
      if (error) throw error;
      setHeygenAvatars(data?.avatars || []);
    } catch (error) {
      console.error('Error fetching HeyGen avatars:', error);
      toast({
        title: "Warning",
        description: "Could not load HeyGen avatars. You can still enter the ID manually.",
        variant: "destructive"
      });
    } finally {
      setLoadingHeygenAvatars(false);
    }
  };

  // Fetch HeyGen voices
  const fetchHeygenVoices = async () => {
    setLoadingHeygenVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('heygen-get-voices');
      if (error) throw error;
      setHeygenVoices(data?.voices || []);
    } catch (error) {
      console.error('Error fetching HeyGen voices:', error);
      toast({
        title: "Warning",
        description: "Could not load HeyGen voices. You can still enter the ID manually.",
        variant: "destructive"
      });
    } finally {
      setLoadingHeygenVoices(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCelebrity();
      fetchCategories();
      fetchHeygenAvatars();
      fetchHeygenVoices();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrity_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCelebrity = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCelebrity(data);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('celebrity_events')
        .select('*')
        .eq('celebrity_id', id)
        .order('event_date', { ascending: false });
      setEvents(eventsData || []);

      // Fetch media
      const { data: mediaData } = await supabase
        .from('celebrity_media')
        .select('*')
        .eq('celebrity_id', id)
        .order('created_at', { ascending: false });
      setMedia(mediaData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Celebrity not found",
        variant: "destructive"
      });
      navigate('/admin/celebrities');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('celebrities')
        .update(celebrity)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Celebrity updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update celebrity",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      const fileName = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('celebrity-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('celebrity-avatars')
        .getPublicUrl(fileName);

      setCelebrity(prev => prev ? { ...prev, image_url: urlData.publicUrl } : null);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not upload image",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('celebrity_events')
          .update(eventForm)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('celebrity_events')
          .insert([{ ...eventForm, celebrity_id: id }]);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Event ${editingEvent ? 'updated' : 'created'} successfully`
      });
      
      setIsEventDialogOpen(false);
      resetEventForm();
      fetchCelebrity();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not save event",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase
        .from('celebrity_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully"
      });
      
      fetchCelebrity();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not delete event",
        variant: "destructive"
      });
    }
  };

  const handleMediaUpload = async (file: File) => {
    try {
      if (!id) {
        toast({
          title: "Error",
          description: "Celebrity ID not found",
          variant: "destructive"
        });
        return;
      }

      // Determine bucket based on media type
      const bucket = mediaForm.is_promotional ? 'promotional-content' : 'celebrity-avatars';
      
      const fileName = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('celebrity_media')
        .insert([{
          celebrity_id: id,
          title: mediaForm.title,
          description: mediaForm.description,
          media_type: mediaForm.media_type,
          file_url: urlData.publicUrl,
          is_avatar_content: mediaForm.is_avatar_content,
          is_promotional: mediaForm.is_promotional,
          consent_recorded: mediaForm.consent_recorded,
          is_public: mediaForm.is_public
        }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Media uploaded successfully"
      });
      
      setIsMediaDialogOpen(false);
      resetMediaForm();
      fetchCelebrity();
    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not upload media",
        variant: "destructive"
      });
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: "",
      description: "",
      event_date: "",
      event_type: "premiere",
      location: "",
      is_public: true
    });
    setEditingEvent(null);
  };

  const resetMediaForm = () => {
    setMediaForm({
      title: "",
      description: "",
      media_type: "image",
      is_avatar_content: false,
      is_promotional: false,
      consent_recorded: false,
      is_public: false
    });
  };

  const openEditEvent = (event: CelebrityEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_type: event.event_type,
      location: event.location || "",
      is_public: event.is_public
    });
    setIsEventDialogOpen(true);
  };

  const updateField = (field: keyof CelebrityData, value: any) => {
    setCelebrity(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-red-500">Celebrity Not Found</div>
          <Button className="mt-4" onClick={() => navigate('/admin/celebrities')}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/celebrities')} className="w-fit shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Celebrities
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold truncate">Edit Celebrity</h1>
            <p className="text-sm text-muted-foreground truncate">Manage {celebrity.name}'s profile</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto shrink-0">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full overflow-x-auto no-scrollbar justify-start gap-1 p-1">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Commission</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="media">Media Gallery</TabsTrigger>
          <TabsTrigger value="consent" className={celebrity.consent_status === 'submitted' ? 'text-amber-600 dark:text-amber-400' : ''}>
            Consent {celebrity.consent_status === 'submitted' && '⚠️'}
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={celebrity.name}
                        onChange={(e) => updateField('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={celebrity.category} onValueChange={(value) => updateField('category', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={celebrity.bio || ""}
                      onChange={(e) => updateField('bio', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={celebrity.location || ""}
                        onChange={(e) => updateField('location', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="followers">Followers</Label>
                      <Input
                        id="followers"
                        value={celebrity.followers || ""}
                        onChange={(e) => updateField('followers', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image_url">Profile Image</Label>
                    <div className="space-y-2">
                      <Input
                        id="image_url"
                        value={celebrity.image_url || ""}
                        onChange={(e) => updateField('image_url', e.target.value)}
                        placeholder="Image URL or upload below"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          id="imageUpload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('imageUpload')?.click()}
                          disabled={uploadingImage}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingImage ? "Uploading..." : "Upload Image"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={celebrity.is_verified}
                        onChange={(e) => updateField('is_verified', e.target.checked)}
                      />
                      <span>Verified</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={celebrity.is_active}
                        onChange={(e) => updateField('is_active', e.target.checked)}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* VAPI Voice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Voice Call Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vapi_voice_id">ElevenLabs Voice ID</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 relative">
                        <Input
                          id="vapi_voice_id"
                          value={(celebrity as any).vapi_voice_id || ""}
                          onChange={(e) => handleVoiceIdChange(e.target.value)}
                          placeholder="Enter ElevenLabs voice ID"
                          className={voiceVerified === true ? 'border-green-500 pr-10' : voiceVerified === false ? 'border-red-500 pr-10' : ''}
                        />
                        {voiceVerified === true && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {voiceVerified === false && (
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifyVoiceId}
                        disabled={verifyingVoice || !(celebrity as any).vapi_voice_id}
                      >
                        {verifyingVoice ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify Voice'
                        )}
                      </Button>
                    </div>
                    {voiceVerified === true && verifiedVoiceName && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Verified: {verifiedVoiceName}
                      </p>
                    )}
                    {voiceVerified === true && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Voice verified — click "Save Changes" to apply this voice ID for calls.
                      </p>
                    )}
                    {voiceVerificationError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {voiceVerificationError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Voice ID from ElevenLabs for celebrity voice calls. Verify before saving.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="voice_call_price">Voice Call Price (₹)</Label>
                    <Input
                      id="voice_call_price"
                      type="number"
                      value={(celebrity as any).voice_call_price || 500}
                      onChange={(e) => updateField('voice_call_price' as keyof CelebrityData, parseInt(e.target.value) || 500)}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Price per voice call wish using this celebrity's voice
                    </p>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="vapi_phone_id">Vapi Phone Number ID</Label>
                    <Input
                      id="vapi_phone_id"
                      value={(celebrity as any).vapi_phone_id || ""}
                      onChange={(e) => updateField('vapi_phone_id' as keyof CelebrityData, e.target.value)}
                      placeholder="e.g., a412affb-e24c-43b7-b926-918b81857764"
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique Vapi Phone Number ID for this celebrity's outbound calls. Get this from your Vapi dashboard under Phone Numbers.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Each celebrity can have their own phone number for calls. If not set, the default platform phone number will be used.
                    </p>
                  </div>
                  
                  {/* HeyGen Video Generation Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium text-sm">HeyGen Video Configuration</h4>
                    
                    {/* Avatar Selection with Search */}
                    <div className="space-y-2">
                      <Label htmlFor="heygen_avatar_id">HeyGen Avatar <span className="text-red-500">*</span></Label>
                      {loadingHeygenAvatars ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading avatars...
                        </div>
                      ) : heygenAvatars.length > 0 ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Search avatars by name or ID..."
                            value={avatarSearch}
                            onChange={(e) => setAvatarSearch(e.target.value)}
                            className="bg-background"
                          />
                          <div className="border rounded-md max-h-[200px] overflow-y-auto bg-background">
                            {heygenAvatars
                              .filter(a => {
                                if (!avatarSearch) return true;
                                const q = avatarSearch.toLowerCase();
                                return a.avatar_name.toLowerCase().includes(q) || a.avatar_id.toLowerCase().includes(q);
                              })
                              .slice(0, 50)
                              .map((avatar) => (
                                <button
                                  key={avatar.avatar_id}
                                  type="button"
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-left ${
                                    (celebrity as any).heygen_avatar_id === avatar.avatar_id ? 'bg-accent font-medium' : ''
                                  }`}
                                  onClick={() => updateField('heygen_avatar_id' as keyof CelebrityData, avatar.avatar_id)}
                                >
                                  {avatar.preview_image_url && (
                                    <img src={avatar.preview_image_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" loading="lazy" />
                                  )}
                                  <span className="truncate">{avatar.avatar_name}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">({avatar.avatar_id.slice(0, 12)}...)</span>
                                  {(celebrity as any).heygen_avatar_id === avatar.avatar_id && (
                                    <Check className="w-4 h-4 ml-auto text-primary flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            {heygenAvatars.filter(a => {
                              if (!avatarSearch) return true;
                              const q = avatarSearch.toLowerCase();
                              return a.avatar_name.toLowerCase().includes(q) || a.avatar_id.toLowerCase().includes(q);
                            }).length === 0 && (
                              <p className="text-sm text-muted-foreground p-3">No avatars found</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{heygenAvatars.length} avatars available</p>
                        </div>
                      ) : (
                        <Input
                          id="heygen_avatar_id"
                          value={(celebrity as any).heygen_avatar_id || ""}
                          onChange={(e) => updateField('heygen_avatar_id' as keyof CelebrityData, e.target.value)}
                          placeholder="e.g., avatar_abc123..."
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Avatar from HeyGen for video generation. Required for video wishes.
                      </p>
                      {(celebrity as any).heygen_avatar_id && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          Selected: {(celebrity as any).heygen_avatar_id}
                        </div>
                      )}
                    </div>

                    {/* Voice Selection with Search */}
                    <div className="space-y-2">
                      <Label htmlFor="heygen_voice_id">HeyGen Voice <span className="text-red-500">*</span></Label>
                      {loadingHeygenVoices ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading voices...
                        </div>
                      ) : heygenVoices.length > 0 ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Search voices by name, language or ID..."
                            value={voiceSearch}
                            onChange={(e) => setVoiceSearch(e.target.value)}
                            className="bg-background"
                          />
                          <div className="border rounded-md max-h-[200px] overflow-y-auto bg-background">
                            {heygenVoices
                              .filter(v => {
                                if (!voiceSearch) return true;
                                const q = voiceSearch.toLowerCase();
                                return v.voice_name.toLowerCase().includes(q) || v.voice_id.toLowerCase().includes(q) || (v.language || '').toLowerCase().includes(q);
                              })
                              .slice(0, 50)
                              .map((voice) => (
                                <button
                                  key={voice.voice_id}
                                  type="button"
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-left ${
                                    (celebrity as any).heygen_voice_id === voice.voice_id ? 'bg-accent font-medium' : ''
                                  }`}
                                  onClick={() => updateField('heygen_voice_id' as keyof CelebrityData, voice.voice_id)}
                                >
                                  <span className="truncate">{voice.voice_name}</span>
                                  {voice.language && <span className="text-xs text-muted-foreground flex-shrink-0">({voice.language})</span>}
                                  {(celebrity as any).heygen_voice_id === voice.voice_id && (
                                    <Check className="w-4 h-4 ml-auto text-primary flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            {heygenVoices.filter(v => {
                              if (!voiceSearch) return true;
                              const q = voiceSearch.toLowerCase();
                              return v.voice_name.toLowerCase().includes(q) || v.voice_id.toLowerCase().includes(q) || (v.language || '').toLowerCase().includes(q);
                            }).length === 0 && (
                              <p className="text-sm text-muted-foreground p-3">No voices found</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{heygenVoices.length} voices available</p>
                        </div>
                      ) : (
                        <Input
                          id="heygen_voice_id"
                          value={(celebrity as any).heygen_voice_id || ""}
                          onChange={(e) => updateField('heygen_voice_id' as keyof CelebrityData, e.target.value)}
                          placeholder="e.g., voice_xyz789..."
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Voice from HeyGen for video generation. Required for video wishes.
                      </p>
                      {(celebrity as any).heygen_voice_id && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          Selected: {(celebrity as any).heygen_voice_id}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        fetchHeygenAvatars();
                        fetchHeygenVoices();
                      }}
                      disabled={loadingHeygenAvatars || loadingHeygenVoices}
                    >
                      {(loadingHeygenAvatars || loadingHeygenVoices) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Refresh HeyGen Options
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{celebrity.rating.toFixed(1)} Rating</span>
                    <span className="text-muted-foreground">({celebrity.review_count} reviews)</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earnings:</span>
                      <span className="font-medium">₹{celebrity.total_earnings?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-medium">₹{celebrity.available_balance?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    {celebrity.image_url && (
                      <img 
                        src={celebrity.image_url} 
                        alt={celebrity.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto"
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{celebrity.name}</h3>
                      <p className="text-sm text-muted-foreground">{celebrity.category}</p>
                      <p className="text-sm text-muted-foreground">{celebrity.location}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">₹{(celebrity.service_prices?.general_wish || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Starting Price</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Pricing & Commission Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="generalPrice">General Wish Price (₹)</Label>
                  <Input
                    id="generalPrice"
                    type="number"
                    value={celebrity.service_prices?.general_wish || 0}
                    onChange={(e) => setCelebrity({
                      ...celebrity,
                      service_prices: { ...celebrity.service_prices, general_wish: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="imagePrice">Image Promotion Price (₹)</Label>
                  <Input
                    id="imagePrice"
                    type="number"
                    value={celebrity.service_prices?.image_promotion || 0}
                    onChange={(e) => setCelebrity({
                      ...celebrity,
                      service_prices: { ...celebrity.service_prices, image_promotion: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="videoPrice">Video Promotion Price (₹)</Label>
                  <Input
                    id="videoPrice"
                    type="number"
                    value={celebrity.service_prices?.video_promotion || 0}
                    onChange={(e) => setCelebrity({
                      ...celebrity,
                      service_prices: { ...celebrity.service_prices, video_promotion: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="ugcAdPrice">UGC Ad Price (₹)</Label>
                  <Input
                    id="ugcAdPrice"
                    type="number"
                    value={celebrity.service_prices?.ugc_ad || 0}
                    onChange={(e) => setCelebrity({
                      ...celebrity,
                      service_prices: { ...celebrity.service_prices, ugc_ad: parseInt(e.target.value) }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Price for AI-generated UGC video ads
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission">Commission Percentage (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    value={celebrity.commission_percentage}
                    onChange={(e) => updateField('commission_percentage', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    value={celebrity.delivery_time}
                    onChange={(e) => updateField('delivery_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Earnings</Label>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{celebrity.total_earnings?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <Label>Available Balance</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{celebrity.available_balance?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Celebrity Events</CardTitle>
              <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetEventForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingEvent ? 'Edit Event' : 'Add New Event'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="eventTitle">Title</Label>
                      <Input
                        id="eventTitle"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventDescription">Description</Label>
                      <Textarea
                        id="eventDescription"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="eventDate">Event Date</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="eventType">Event Type</Label>
                        <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="premiere">Premiere</SelectItem>
                            <SelectItem value="concert">Concert</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="eventLocation">Location</Label>
                      <Input
                        id="eventLocation"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="eventPublic"
                        checked={eventForm.is_public}
                        onChange={(e) => setEventForm({ ...eventForm, is_public: e.target.checked })}
                      />
                      <Label htmlFor="eventPublic">Public Event</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEvent}>
                        {editingEvent ? 'Update' : 'Add'} Event
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                        <span>{event.event_date}</span>
                        <span>{event.event_type}</span>
                        {event.location && <span>{event.location}</span>}
                        <Badge variant={event.is_public ? "default" : "secondary"}>
                          {event.is_public ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditEvent(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No events added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Gallery Tab */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Media Gallery</CardTitle>
              <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetMediaForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload New Media</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mediaTitle">Title</Label>
                      <Input
                        id="mediaTitle"
                        value={mediaForm.title}
                        onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mediaDescription">Description</Label>
                      <Textarea
                        id="mediaDescription"
                        value={mediaForm.description}
                        onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mediaType">Media Type</Label>
                      <Select value={mediaForm.media_type} onValueChange={(value) => setMediaForm({ ...mediaForm, media_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Upload File</Label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMediaUpload(file);
                        }}
                        className="w-full"
                        accept={mediaForm.media_type === 'image' ? 'image/*' : mediaForm.media_type === 'video' ? 'video/*' : 'audio/*'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mediaForm.is_avatar_content}
                          onChange={(e) => setMediaForm({ ...mediaForm, is_avatar_content: e.target.checked })}
                        />
                        <span>Avatar Content</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mediaForm.is_promotional}
                          onChange={(e) => setMediaForm({ ...mediaForm, is_promotional: e.target.checked })}
                        />
                        <span>Promotional</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mediaForm.consent_recorded}
                          onChange={(e) => setMediaForm({ ...mediaForm, consent_recorded: e.target.checked })}
                        />
                        <span>Consent Recorded</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mediaForm.is_public}
                          onChange={(e) => setMediaForm({ ...mediaForm, is_public: e.target.checked })}
                        />
                        <span>Public</span>
                      </label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                      {item.media_type === 'image' ? (
                        <img src={item.file_url} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                      ) : item.media_type === 'video' ? (
                        <Video className="w-8 h-8 text-muted-foreground" />
                      ) : (
                        <Music className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">{item.media_type}</Badge>
                      {item.is_avatar_content && <Badge variant="default" className="text-xs">Avatar</Badge>}
                      {item.is_promotional && <Badge variant="secondary" className="text-xs">Promo</Badge>}
                      {item.is_public && <Badge variant="default" className="text-xs">Public</Badge>}
                    </div>
                  </div>
                ))}
                {media.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 col-span-3">No media uploaded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent Review Tab */}
        <TabsContent value="consent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Consent Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Consent Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div>
                  <p className="font-medium">Current Status</p>
                  <Badge 
                    variant={
                      celebrity.consent_status === 'approved' ? 'default' : 
                      celebrity.consent_status === 'rejected' ? 'destructive' : 
                      celebrity.consent_status === 'submitted' ? 'secondary' : 
                      'outline'
                    }
                    className="mt-1"
                  >
                    {celebrity.consent_status === 'approved' ? 'Approved' : 
                     celebrity.consent_status === 'submitted' ? 'Pending Review' : 
                     celebrity.consent_status === 'rejected' ? 'Rejected' : 
                     'No Consent Submitted'}
                  </Badge>
                  {celebrity.consent_given_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted: {new Date(celebrity.consent_given_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {celebrity.consent_status === 'submitted' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('celebrities')
                          .update({ consent_status: 'approved' })
                          .eq('id', celebrity.id);
                        if (!error) {
                          setCelebrity(prev => prev ? { ...prev, consent_status: 'approved' } : null);
                          toast({ title: "Success", description: "Consent approved" });
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const { error } = await supabase
                          .from('celebrities')
                          .update({ consent_status: 'rejected' })
                          .eq('id', celebrity.id);
                        if (!error) {
                          setCelebrity(prev => prev ? { ...prev, consent_status: 'rejected' } : null);
                          toast({ title: "Consent Rejected", description: "Consent has been rejected" });
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Consent Photo */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Consent Photo
                </h3>
                {celebrity.consent_photo_url ? (
                  <div className="border rounded-lg overflow-hidden max-w-md">
                    <img 
                      src={celebrity.consent_photo_url} 
                      alt="Consent photo"
                      className="w-full h-auto object-contain max-h-96"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm p-4 border rounded-lg">No consent photo uploaded</p>
                )}
              </div>

              {/* Consent Video */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Consent Video
                </h3>
                {celebrity.consent_video_url ? (
                  <div className="border rounded-lg overflow-hidden max-w-lg">
                    <video 
                      src={celebrity.consent_video_url} 
                      controls 
                      className="w-full h-auto max-h-96"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm p-4 border rounded-lg">No consent video uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}