import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Music, Download, Search, Trash2, Clock, CheckCircle, XCircle, Loader2, Volume2, Mic, Wand2, FileAudio, Image } from "lucide-react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/hooks/use-toast";

interface AudioItem {
  id: string;
  type: 'Music' | 'TTS' | 'Voice Convert' | 'SFX' | 'Isolation' | 'Image+Music';
  title: string;
  status: string;
  audio_url: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { color: string; icon: any }> = {
  'Music': { color: 'bg-purple-500', icon: Music },
  'TTS': { color: 'bg-blue-500', icon: Volume2 },
  'Voice Convert': { color: 'bg-green-500', icon: Mic },
  'SFX': { color: 'bg-orange-500', icon: Wand2 },
  'Isolation': { color: 'bg-cyan-500', icon: FileAudio },
  'Image+Music': { color: 'bg-pink-500', icon: Image },
};

export default function MyMusic() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAllAudio();
  }, []);

  const loadAllAudio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!profile) return;

      const userId = profile.id;

      // Query all 6 tables in parallel
      const [musicRes, ttsRes, voiceRes, sfxRes, isoRes, imgRes] = await Promise.all([
        supabase.from('music_generations').select('id, song_title, status, song_url, download_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('tts_generations').select('id, text, status, audio_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('voice_conversion_generations').select('id, original_file_name, status, audio_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('sound_effect_generations').select('id, description, status, audio_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('audio_isolation_generations').select('id, original_file_name, status, audio_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('image_music_generations').select('id, description, status, audio_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      const allItems: AudioItem[] = [];

      (musicRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'Music', title: r.song_title || 'Untitled Song',
        status: r.status, audio_url: r.download_url || r.song_url, created_at: r.created_at,
      }));
      (ttsRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'TTS', title: (r.text || '').slice(0, 60) || 'Text to Speech',
        status: r.status, audio_url: r.audio_url, created_at: r.created_at,
      }));
      (voiceRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'Voice Convert', title: r.original_file_name || 'Voice Conversion',
        status: r.status, audio_url: r.audio_url, created_at: r.created_at,
      }));
      (sfxRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'SFX', title: (r.description || '').slice(0, 60) || 'Sound Effect',
        status: r.status, audio_url: r.audio_url, created_at: r.created_at,
      }));
      (isoRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'Isolation', title: r.original_file_name || 'Audio Isolation',
        status: r.status, audio_url: r.audio_url, created_at: r.created_at,
      }));
      (imgRes.data || []).forEach(r => allItems.push({
        id: r.id, type: 'Image+Music', title: (r.description || '').slice(0, 60) || 'Image + Music',
        status: r.status, audio_url: r.audio_url, created_at: r.created_at,
      }));

      // Sort by created_at DESC
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(allItems);
    } catch (error: any) {
      console.error('Error loading audio library:', error);
      toast({ title: "Error", description: "Failed to load your audio library", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (item: AudioItem) => {
    if (!confirm('Delete this item?')) return;
    const tableMap: Record<string, string> = {
      'Music': 'music_generations',
      'TTS': 'tts_generations',
      'Voice Convert': 'voice_conversion_generations',
      'SFX': 'sound_effect_generations',
      'Isolation': 'audio_isolation_generations',
      'Image+Music': 'image_music_generations',
    };
    try {
      const table = tableMap[item.type] as any;
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "Deleted" });
    } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  const isValidUrl = (url: string | null) => url && (url.startsWith('http://') || url.startsWith('https://'));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>;
      case 'processing': return <Badge className="bg-blue-500 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Audio Library
            </h1>
            <p className="text-muted-foreground mt-2">
              {items.length} {items.length === 1 ? 'item' : 'items'} generated
            </p>
          </div>
          <Button onClick={() => navigate('/music-studio')}>
            <Music className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by title or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">Loading your audio library...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No items match your search' : "You haven't created any audio yet. Go to Music Studio to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/music-studio')} className="mt-4">
                  Go to Music Studio
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type];
              const IconComp = config?.icon || Music;
              return (
                <Card key={`${item.type}-${item.id}`} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1.5 rounded ${config?.color || 'bg-primary'}`}>
                          <IconComp className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{item.type}</Badge>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {item.status === 'completed' && isValidUrl(item.audio_url) && (
                      <audio controls className="w-full h-10" src={item.audio_url!} preload="none" />
                    )}

                    {item.status === 'completed' && !isValidUrl(item.audio_url) && (
                      <p className="text-xs text-muted-foreground italic">Audio stored as temporary data — re-generate for permanent access</p>
                    )}

                    {item.status === 'processing' && (
                      <div className="text-center py-3 text-sm text-muted-foreground">
                        <Loader2 className="w-6 h-6 mx-auto mb-1 animate-spin" />
                        Processing...
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <p className="text-center py-2 text-sm text-destructive">Generation failed</p>
                    )}

                    <div className="flex gap-2">
                      {item.status === 'completed' && isValidUrl(item.audio_url) && (
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <a href={item.audio_url!} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-1" />Download
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => deleteItem(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
