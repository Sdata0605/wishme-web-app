import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, MapPin, Calendar, Upload } from "lucide-react";

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

export function CelebrityContentManager() {
  const [events, setEvents] = useState<CelebrityEvent[]>([]);
  const [media, setMedia] = useState<CelebrityMedia[]>([]);
  const [celebrity, setCelebrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CelebrityEvent | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_type: "other",
    location: "",
    is_public: true
  });

  const [mediaForm, setMediaForm] = useState({
    title: "",
    description: "",
    media_type: "photo",
    is_avatar_content: false,
    is_promotional: false,
    is_public: false
  });

  useEffect(() => {
    if (profile) {
      fetchCelebrityData();
    }
  }, [profile]);

  const fetchCelebrityData = async () => {
    try {
      // Get celebrity data
      const { data: celebrityData, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (celebError) throw celebError;
      
      if (!celebrityData) {
        toast({
          title: "Not a celebrity",
          description: "You need to register as a celebrity first",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      setCelebrity(celebrityData);

      // Get events
      const { data: eventsData, error: eventsError } = await supabase
        .from('celebrity_events')
        .select('*')
        .eq('celebrity_id', celebrityData.id)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Get media
      const { data: mediaData, error: mediaError } = await supabase
        .from('celebrity_media')
        .select('*')
        .eq('celebrity_id', celebrityData.id)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load celebrity data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!celebrity) return;

    try {
      const eventData = {
        ...eventForm,
        celebrity_id: celebrity.id
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('celebrity_events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({ title: "Success", description: "Event updated successfully" });
      } else {
        const { error } = await supabase
          .from('celebrity_events')
          .insert([eventData]);

        if (error) throw error;
        toast({ title: "Success", description: "Event created successfully" });
      }

      fetchCelebrityData();
      resetEventForm();
      setIsEventDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save event",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('celebrity_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Event deleted successfully" });
      fetchCelebrityData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const handleMediaUpload = async (file: File) => {
    if (!celebrity) return;

    setUploadingMedia(true);
    try {
      // Create filename
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${celebrity.id}/${mediaForm.media_type}_${timestamp}.${fileExt}`;
      
      // Determine bucket based on content type
      const bucket = mediaForm.is_avatar_content ? 'celebrity-avatars' : 'promotional-content';
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Save media record
      const { error: mediaError } = await supabase
        .from('celebrity_media')
        .insert([{
          ...mediaForm,
          celebrity_id: celebrity.id,
          file_url: urlData.publicUrl,
          consent_recorded: true,
          consent_timestamp: new Date().toISOString()
        }]);

      if (mediaError) throw mediaError;

      toast({ title: "Success", description: "Media uploaded successfully" });
      fetchCelebrityData();
      resetMediaForm();
      setIsMediaDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload media",
        variant: "destructive"
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: "",
      description: "",
      event_date: "",
      event_type: "other",
      location: "",
      is_public: true
    });
    setEditingEvent(null);
  };

  const resetMediaForm = () => {
    setMediaForm({
      title: "",
      description: "",
      media_type: "photo",
      is_avatar_content: false,
      is_promotional: false,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Become a Celebrity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">You are not registered as a celebrity yet. Sign up to manage events and upload media.</p>
          <a href="/celebrity-signup">
            <Button>Go to Celebrity Signup</Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Events Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Events & Releases</span>
          </CardTitle>
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetEventForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    placeholder="Movie premiere, award show, etc."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Date</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({...eventForm, event_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Type</Label>
                    <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({...eventForm, event_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie_release">Movie Release</SelectItem>
                        <SelectItem value="award_show">Award Show</SelectItem>
                        <SelectItem value="concert">Concert</SelectItem>
                        <SelectItem value="premiere">Premiere</SelectItem>
                        <SelectItem value="anniversary">Anniversary</SelectItem>
                        <SelectItem value="birthday">Birthday</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    placeholder="City, venue, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    placeholder="Event details..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={eventForm.is_public}
                    onChange={(e) => setEventForm({...eventForm, is_public: e.target.checked})}
                  />
                  <Label htmlFor="is_public">Public event (visible to fans)</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEvent}>
                    {editingEvent ? "Update" : "Create"} Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No events added yet. Create your first event to keep fans updated!
            </p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant={event.is_public ? "default" : "secondary"}>
                          {event.is_public ? "Public" : "Private"}
                        </Badge>
                        <Badge variant="outline">{event.event_type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                      {event.location && (
                        <p className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm mt-2">{event.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditEvent(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Media Gallery</CardTitle>
          <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetMediaForm}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="media_title">Title</Label>
                  <Input
                    id="media_title"
                    value={mediaForm.title}
                    onChange={(e) => setMediaForm({...mediaForm, title: e.target.value})}
                    placeholder="Media title"
                  />
                </div>

                <div>
                  <Label htmlFor="media_type">Type</Label>
                  <Select value={mediaForm.media_type} onValueChange={(value) => setMediaForm({...mediaForm, media_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_avatar_content"
                      checked={mediaForm.is_avatar_content}
                      onChange={(e) => setMediaForm({...mediaForm, is_avatar_content: e.target.checked})}
                    />
                    <Label htmlFor="is_avatar_content">Avatar training content</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_promotional"
                      checked={mediaForm.is_promotional}
                      onChange={(e) => setMediaForm({...mediaForm, is_promotional: e.target.checked})}
                    />
                    <Label htmlFor="is_promotional">Promotional content</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={mediaForm.is_public}
                      onChange={(e) => setMediaForm({...mediaForm, is_public: e.target.checked})}
                    />
                    <Label htmlFor="is_public">Public (visible to fans)</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file_upload">Select File</Label>
                  <Input
                    type="file"
                    id="file_upload"
                    accept={mediaForm.media_type === 'photo' ? 'image/*' : mediaForm.media_type === 'video' ? 'video/*' : 'audio/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleMediaUpload(file);
                      }
                    }}
                    disabled={uploadingMedia}
                  />
                  {uploadingMedia && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Uploading...
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Consent Notice:</strong> By uploading, you consent to the use of this content for the specified purposes. This consent is recorded with timestamp.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No media uploaded yet. Start building your content library!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {media.map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {item.media_type === 'photo' ? (
                      <img src={item.file_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{item.media_type}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.is_avatar_content && <Badge variant="outline" className="text-xs">Avatar</Badge>}
                      {item.is_promotional && <Badge variant="outline" className="text-xs">Promo</Badge>}
                      {item.is_public && <Badge variant="default" className="text-xs">Public</Badge>}
                      {item.consent_recorded && <Badge variant="secondary" className="text-xs">Consented</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}