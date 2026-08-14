import { useState, useEffect } from 'react';
import { Search, Star, Phone, Lock, BadgeCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  vapi_voice_id: string;
  voice_call_price: number;
  rating: number;
  is_verified: boolean;
  bio?: string;
  followers?: number | string;
  vapi_phone_id?: string;
}

interface CelebrityCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCelebrity: (celebrity: Celebrity) => void;
  profileId?: string;
}

export function CelebrityCallModal({ open, onOpenChange, onSelectCelebrity, profileId }: CelebrityCallModalProps) {
  const navigate = useNavigate();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchCelebrities();
    }
  }, [open]);

  const fetchCelebrities = async () => {
    setLoading(true);
    try {
      // Fetch celebrities and subscriptions in parallel
      const celebPromise = supabase
        .from('celebrities')
        .select('id, name, category, image_url, vapi_voice_id, voice_call_price, rating, is_verified, bio, followers, vapi_phone_id')
        .not('vapi_voice_id', 'is', null)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      const subPromise = profileId
        ? supabase
            .from('celebrity_favorites')
            .select('celebrity_id')
            .eq('user_id', profileId)
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null });

      const [celebResult, subResult] = await Promise.all([celebPromise, subPromise]);

      if (celebResult.error) throw celebResult.error;
      if (subResult.error) throw subResult.error;

      const subSet = new Set((subResult.data || []).map(s => s.celebrity_id));
      setSubscribedIds(subSet);

      // Sort: subscribed first
      const sorted = [...(celebResult.data || [])].sort((a, b) => {
        const aS = subSet.has(a.id) ? 0 : 1;
        const bS = subSet.has(b.id) ? 0 : 1;
        return aS - bS;
      });

      setCelebrities(sorted);
    } catch (error) {
      console.error('Error fetching celebrities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load celebrities. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCelebrities = celebrities.filter(celeb =>
    celeb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    celeb.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (celebrity: Celebrity) => {
    if (!subscribedIds.has(celebrity.id)) return;
    onSelectCelebrity(celebrity);
    onOpenChange(false);
  };

  const handleSubscribeRedirect = (celebrityId: string) => {
    onOpenChange(false);
    navigate(`/celebrity/${celebrityId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="h-5 w-5 text-primary" />
            Select Celebrity for Voice Call
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Choose a subscribed celebrity to send a personalized voice call wish
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search celebrities by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[450px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading celebrities...</span>
            </div>
          ) : filteredCelebrities.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {celebrities.length === 0 
                  ? 'No celebrities with voice calling available yet.'
                  : 'No celebrities match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-4">
              {filteredCelebrities.map((celebrity) => {
                const isSubscribed = subscribedIds.has(celebrity.id);

                return (
                  <div
                    key={celebrity.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isSubscribed
                        ? 'bg-card hover:bg-accent/50 cursor-pointer group'
                        : 'bg-muted/40 opacity-75'
                    }`}
                    onClick={() => isSubscribed && handleSelect(celebrity)}
                  >
                    <Avatar className={`h-16 w-16 border-2 ${isSubscribed ? 'border-primary/30' : 'border-border'}`}>
                      <AvatarImage src={celebrity.image_url || undefined} alt={celebrity.name} />
                      <AvatarFallback className="text-lg font-semibold bg-primary/10">
                        {celebrity.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{celebrity.name}</h3>
                        {celebrity.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        {isSubscribed && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Subscribed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">{celebrity.category}</Badge>
                        {celebrity.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {celebrity.rating.toFixed(1)}
                          </div>
                        )}
                        {celebrity.followers && Number(celebrity.followers) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Number(celebrity.followers).toLocaleString()} followers
                          </span>
                        )}
                      </div>
                      {celebrity.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{celebrity.bio}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      {isSubscribed ? (
                        <>
                          <div className="text-lg font-bold text-primary">
                            ₹{celebrity.voice_call_price || 500}
                          </div>
                          <div className="text-xs text-muted-foreground">per call</div>
                          <Button
                            size="sm"
                            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Select
                          </Button>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubscribeRedirect(celebrity.id);
                            }}
                          >
                            Subscribe First
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Only subscribed celebrities can be selected for voice calls. Subscribe to a celebrity from their profile page.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
