import { saveCelebrity } from "@/lib/saveCelebrity";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, Upload, Music, Image as ImageIcon, Video, Trash2, Edit, 
  Plus, Star, CheckCircle, XCircle, MapPin, Users, IndianRupee, Save
} from "lucide-react";

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

interface CelebrityFullEditProps {
  celebrityId: string;
  onSave: () => void;
}

export function CelebrityFullEdit({ celebrityId, onSave }: CelebrityFullEditProps) {
  const [celebrity, setCelebrity] = useState<any>(null);
  const [events, setEvents] = useState<CelebrityEvent[]>([]);
  const [media, setMedia] = useState<CelebrityMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CelebrityEvent | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    if (celebrityId) {
      fetchCelebrityData();
    }
  }, [celebrityId]);

  const fetchCelebrityData = async () => {
    try {
      setLoading(true);
      const { data: celebrityData, error: celebrityError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();
      if (celebrityError) throw celebrityError;
      setCelebrity(celebrityData);

      const { data: eventsData, error: eventsError } = await supabase
        .from('celebrity_events')
        .select('*')
        .eq('celebrity_id', celebrityId)
        .order('event_date', { ascending: false });
      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      const { data: mediaData, error: mediaError } = await supabase
        .from('celebrity_media')
        .select('*')
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });
      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Could not load celebrity data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateCelebrity = async (updates: any) => {
    setSaving(true);
    try {
      const result = await saveCelebrity(celebrityId, updates);
      if (!result.ok) {
        toast({ title: "Could not save", description: result.message || "The celebrity was not updated.", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Prices and commission updated. The app and website use them straight away." });
      onSave();
      fetchCelebrityData();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase.from('celebrity_events').update(eventForm).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('celebrity_events').insert([{ ...eventForm, celebrity_id: celebrityId }]);
        if (error) throw error;
      }
      toast({ title: "Success", description: `Event ${editingEvent ? 'updated' : 'created'} successfully` });
      setIsEventDialogOpen(false);
      resetEventForm();
      fetchCelebrityData();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not save event", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('celebrity_events').delete().eq('id', eventId);
      if (error) throw error;
      toast({ title: "Success", description: "Event deleted successfully" });
      fetchCelebrityData();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not delete event", variant: "destructive" });
    }
  };

  const handleMediaUpload = async (file: File) => {
    try {
      setUploadingMedia(true);
      const fileName = `${celebrityId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('celebrity-avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('celebrity-avatars').getPublicUrl(fileName);
      const { error } = await supabase.from('celebrity_media').insert([{
        ...mediaForm,
        celebrity_id: celebrityId,
        file_url: urlData.publicUrl
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Media uploaded successfully" });
      setIsMediaDialogOpen(false);
      resetMediaForm();
      fetchCelebrityData();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not upload media", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({ title: "", description: "", event_date: "", event_type: "premiere", location: "", is_public: true });
    setEditingEvent(null);
  };

  const resetMediaForm = () => {
    setMediaForm({ title: "", description: "", media_type: "image", is_avatar_content: false, is_promotional: false, consent_recorded: false, is_public: false });
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

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center text-muted-foreground">Loading celebrity data...</div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center text-destructive">Celebrity not found</div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold truncate">Edit: {celebrity.name}</h2>
          <p className="text-sm text-muted-foreground">Manage all aspects of this celebrity profile</p>
        </div>
        <Button
          onClick={() => updateCelebrity(celebrity)}
          disabled={saving}
          className="w-full sm:w-auto shrink-0"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <div className="overflow-x-auto no-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-4 md:w-full">
            <TabsTrigger value="basic" className="shrink-0 text-xs md:text-sm">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing" className="shrink-0 text-xs md:text-sm">Pricing</TabsTrigger>
            <TabsTrigger value="events" className="shrink-0 text-xs md:text-sm">Events</TabsTrigger>
            <TabsTrigger value="media" className="shrink-0 text-xs md:text-sm">Media</TabsTrigger>
          </TabsList>
        </div>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4 md:space-y-6 mt-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={celebrity.name}
                    onChange={(e) => setCelebrity({ ...celebrity, name: e.target.value })}
                    className="text-[16px] md:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select value={celebrity.category} onValueChange={(value) => setCelebrity({ ...celebrity, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actor">Actor</SelectItem>
                      <SelectItem value="Singer">Singer</SelectItem>
                      <SelectItem value="Comedian">Comedian</SelectItem>
                      <SelectItem value="Influencer">Influencer</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={celebrity.bio || ""}
                  onChange={(e) => setCelebrity({ ...celebrity, bio: e.target.value })}
                  rows={4}
                  className="text-[16px] md:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={celebrity.location || ""}
                    onChange={(e) => setCelebrity({ ...celebrity, location: e.target.value })}
                    className="text-[16px] md:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="followers">Followers</Label>
                  <Input
                    id="followers"
                    value={celebrity.followers || ""}
                    onChange={(e) => setCelebrity({ ...celebrity, followers: e.target.value })}
                    className="text-[16px] md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="image_url">Profile Image URL</Label>
                <Input
                  id="image_url"
                  value={celebrity.image_url || ""}
                  onChange={(e) => setCelebrity({ ...celebrity, image_url: e.target.value })}
                  className="text-[16px] md:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="verified" className="text-sm cursor-pointer">Verified</Label>
                  <Switch
                    id="verified"
                    checked={celebrity.is_verified}
                    onCheckedChange={(checked) => setCelebrity({ ...celebrity, is_verified: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="active" className="text-sm cursor-pointer">Active</Label>
                  <Switch
                    id="active"
                    checked={celebrity.is_active}
                    onCheckedChange={(checked) => setCelebrity({ ...celebrity, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="avatar" className="text-sm cursor-pointer">AI Avatar</Label>
                  <Switch
                    id="avatar"
                    checked={celebrity.avatar_trained}
                    onCheckedChange={(checked) => setCelebrity({ ...celebrity, avatar_trained: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing & Commission Tab */}
        <TabsContent value="pricing" className="space-y-4 md:space-y-6 mt-4">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Service Pricing</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="generalPrice">General Wish (₹)</Label>
                  <Input
                    id="generalPrice"
                    type="number"
                    className="text-[16px] md:text-sm"
                    value={celebrity.service_prices?.general_wish || 0}
                    onChange={(e) => setCelebrity({ 
                      ...celebrity, 
                      service_prices: { ...celebrity.service_prices, general_wish: parseInt(e.target.value) } 
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imagePrice">Image Promo (₹)</Label>
                  <Input
                    id="imagePrice"
                    type="number"
                    className="text-[16px] md:text-sm"
                    value={celebrity.service_prices?.image_promotion || 0}
                    onChange={(e) => setCelebrity({ 
                      ...celebrity, 
                      service_prices: { ...celebrity.service_prices, image_promotion: parseInt(e.target.value) } 
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="videoPrice">Video Promo (₹)</Label>
                  <Input
                    id="videoPrice"
                    type="number"
                    className="text-[16px] md:text-sm"
                    value={celebrity.service_prices?.video_promotion || 0}
                    onChange={(e) => setCelebrity({ 
                      ...celebrity, 
                      service_prices: { ...celebrity.service_prices, video_promotion: parseInt(e.target.value) } 
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="commission">Commission (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    className="text-[16px] md:text-sm"
                    value={celebrity.commission_percentage}
                    onChange={(e) => setCelebrity({ ...celebrity, commission_percentage: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    className="text-[16px] md:text-sm"
                    value={celebrity.delivery_time}
                    onChange={(e) => setCelebrity({ ...celebrity, delivery_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border border-border p-3 md:p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-lg md:text-2xl font-bold text-primary">
                    ₹{celebrity.total_earnings?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3 md:p-4">
                  <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-lg md:text-2xl font-bold text-primary">
                    ₹{celebrity.available_balance?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4 md:space-y-6 mt-4">
          <Card>
            <CardHeader className="p-4 md:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base md:text-lg">Events & Releases</CardTitle>
              <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetEventForm} size="sm" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-16px)] max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
                  <DialogHeader>
                    <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="eventTitle">Title</Label>
                      <Input
                        id="eventTitle"
                        className="text-[16px] md:text-sm"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="eventDescription">Description</Label>
                      <Textarea
                        id="eventDescription"
                        className="text-[16px] md:text-sm"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="eventDate">Date</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          className="text-[16px] md:text-sm"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="eventType">Type</Label>
                        <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="premiere">Premiere</SelectItem>
                            <SelectItem value="release">Release</SelectItem>
                            <SelectItem value="concert">Concert</SelectItem>
                            <SelectItem value="fan-meet">Fan Meet</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="eventLocation">Location</Label>
                      <Input
                        id="eventLocation"
                        className="text-[16px] md:text-sm"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <Label htmlFor="publicEvent" className="text-sm cursor-pointer">Public Event</Label>
                      <Switch
                        id="publicEvent"
                        checked={eventForm.is_public}
                        onCheckedChange={(checked) => setEventForm({ ...eventForm, is_public: checked })}
                      />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEvent} className="w-full sm:w-auto">
                        {editingEvent ? 'Update' : 'Create'} Event
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="border border-border rounded-lg p-3 md:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <h4 className="font-medium text-sm md:text-base truncate">{event.title}</h4>
                          <Badge variant={event.is_public ? "default" : "secondary"} className="text-xs shrink-0">
                            {event.is_public ? "Public" : "Private"}
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0">{event.event_type}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs md:text-sm text-muted-foreground mb-1.5 line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 shrink-0" />
                            {new Date(event.event_date).toLocaleDateString()}
                          </span>
                          {event.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                              <span className="truncate max-w-[120px]">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEvent(event)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No events added yet. Click "Add Event" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Gallery Tab */}
        <TabsContent value="media" className="space-y-4 md:space-y-6 mt-4">
          <Card>
            <CardHeader className="p-4 md:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base md:text-lg">Media Gallery</CardTitle>
              <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetMediaForm} size="sm" className="w-full sm:w-auto">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-16px)] max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
                  <DialogHeader>
                    <DialogTitle>Upload New Media</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="mediaTitle">Title</Label>
                      <Input
                        id="mediaTitle"
                        className="text-[16px] md:text-sm"
                        value={mediaForm.title}
                        onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mediaDescription">Description</Label>
                      <Textarea
                        id="mediaDescription"
                        className="text-[16px] md:text-sm"
                        value={mediaForm.description}
                        onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mediaType">Type</Label>
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
                    <div className="space-y-1.5">
                      <Label htmlFor="mediaFile">File</Label>
                      <Input
                        id="mediaFile"
                        type="file"
                        className="text-[16px] md:text-sm"
                        accept={mediaForm.media_type === 'image' ? 'image/*' : mediaForm.media_type === 'video' ? 'video/*' : 'audio/*'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMediaUpload(file);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'is_avatar_content', label: 'Avatar Training Content' },
                        { key: 'is_promotional', label: 'Promotional Content' },
                        { key: 'consent_recorded', label: 'Consent Recorded' },
                        { key: 'is_public', label: 'Public Media' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <Label htmlFor={`media-${key}`} className="text-sm cursor-pointer">{label}</Label>
                          <Switch
                            id={`media-${key}`}
                            checked={(mediaForm as any)[key]}
                            onCheckedChange={(checked) => setMediaForm({ ...mediaForm, [key]: checked })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setIsMediaDialogOpen(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {media.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-3">
                    <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center">
                      {item.media_type === 'image' && <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                      {item.media_type === 'video' && <Video className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                      {item.media_type === 'audio' && <Music className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />}
                    </div>
                    <h5 className="font-medium text-xs md:text-sm mb-1 truncate">{item.title}</h5>
                    <div className="flex flex-wrap gap-1">
                      {item.is_avatar_content && <Badge variant="secondary" className="text-[10px] px-1.5">Avatar</Badge>}
                      {item.is_promotional && <Badge variant="secondary" className="text-[10px] px-1.5">Promo</Badge>}
                      {item.is_public && <Badge variant="default" className="text-[10px] px-1.5">Public</Badge>}
                    </div>
                  </div>
                ))}
                {media.length === 0 && (
                  <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
                    No media uploaded yet. Click "Upload Media" to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
