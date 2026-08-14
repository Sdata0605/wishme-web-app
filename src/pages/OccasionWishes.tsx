import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Send, MessageSquare, Sparkles, Heart, Gift, Cake } from "lucide-react";

interface Celebrity {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

interface CelebrityOccasion {
  id: string;
  celebrity_id: string;
  occasion_name: string;
  occasion_type: string;
  occasion_date: string;
  auto_reply_enabled: boolean;
  celebrities: Celebrity;
}

interface Wish {
  id: string;
  celebrity_id: string;
  occasion_id: string;
  message: string;
  reply_message: string | null;
  reply_sent_at: string | null;
  created_at: string;
  celebrity_occasions: CelebrityOccasion;
}

export default function OccasionWishes() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [celebrityOccasions, setCelebrityOccasions] = useState<CelebrityOccasion[]>([]);
  const [sentWishes, setSentWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [selectedCelebrity, setSelectedCelebrity] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [message, setMessage] = useState("");
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
      fetchSubscriptions();
    }
  }, [profile?.id]);

  const fetchSubscriptions = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('celebrity_favorites')
        .select('celebrity_id')
        .eq('user_id', profile.id)
        .eq('status', 'active');
      setSubscriptions(data?.map(f => f.celebrity_id) || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch ALL upcoming public occasions with celebrity info
      const today = new Date().toISOString().split('T')[0];
      const { data: occasionsData, error: occasionsError } = await supabase
        .from('celebrity_occasions')
        .select('*, celebrities:celebrity_id(id, name, image_url, category)')
        .eq('is_public', true)
        .gte('occasion_date', today)
        .order('occasion_date', { ascending: true });

      if (occasionsError) throw occasionsError;
      setCelebrityOccasions(occasionsData || []);

      // Derive unique celebrities from occasions
      const uniqueCelebs = [
        ...new Map(
          (occasionsData || []).map((o: any) => [o.celebrities.id, o.celebrities])
        ).values()
      ] as Celebrity[];
      setCelebrities(deduplicateCelebrities(uniqueCelebs));

      // Fetch sent wishes - using type assertion since types haven't regenerated
      const { data: wishesData, error: wishesError } = await supabase
        .from('occasion_wishes' as any)
        .select(`
          *,
          celebrity_occasions!inner(
            *,
            celebrities:celebrity_id(id, name, image_url, category)
          )
        `)
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (wishesError) throw wishesError;
      setSentWishes((wishesData as any) || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load occasions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWish = async () => {
    if (!selectedCelebrity || !selectedOccasion || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a celebrity, occasion, and enter your message",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send wishes",
        variant: "destructive"
      });
      return;
    }

    try {
      setSending(true);

      // Insert wish into database - using type assertion since types haven't regenerated
      const { data: wishData, error: wishError } = await supabase
        .from('occasion_wishes' as any)
        .insert({
          user_id: profile.id,
          celebrity_id: selectedCelebrity,
          occasion_id: selectedOccasion,
          message: message.trim()
        })
        .select()
        .single();

      if (wishError) throw wishError;

      // Check if auto-reply is enabled for this occasion
      const occasion = celebrityOccasions.find(o => o.id === selectedOccasion);
      if (occasion?.auto_reply_enabled && wishData) {
        // Generate AI auto-reply
        const { data: replyData, error: replyError } = await supabase.functions.invoke('generate-occasion-auto-reply', {
          body: {
            wish_id: (wishData as any).id,
            celebrity_id: selectedCelebrity,
            occasion_name: occasion.occasion_name,
            user_message: message.trim()
          }
        });

        if (replyError) {
          console.error('Error generating auto-reply:', replyError);
        }
      }

      toast({
        title: "Wish Sent!",
        description: "Your occasion wish has been sent successfully"
      });

      // Reset form
      setMessage("");
      setSelectedCelebrity("");
      setSelectedOccasion("");

      // Refresh wishes
      fetchData();

    } catch (error: any) {
      console.error('Error sending wish:', error);
      toast({
        title: "Error",
        description: "Failed to send wish. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const filteredOccasions = celebrityOccasions.filter(
    o => o.celebrity_id === selectedCelebrity
  );

  if (!profile) {
    return (
      <AuthenticatedLayout showSidebar={false}>
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please log in to send occasion wishes</p>
          <Button onClick={() => navigate('/auth')}>Login</Button>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout showSidebar={!!profile}>
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 pt-20 md:pt-24 mobile-safe-bottom">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Occasion Wishes
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Send heartfelt wishes to your favorite celebrities on their special occasions
          </p>
        </div>

        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="send">Send Wish</TabsTrigger>
            <TabsTrigger value="history">My Wishes</TabsTrigger>
          </TabsList>

          {/* Send Wish Tab */}
          <TabsContent value="send" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Occasion Wish
                </CardTitle>
                <CardDescription>
                  Send wishes to celebrities on their birthdays, anniversaries, and special occasions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="celebrity">Select Celebrity</Label>
                  <Select value={selectedCelebrity} onValueChange={setSelectedCelebrity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a celebrity" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...celebrities].sort((a, b) => {
                        const aS = subscriptions.includes(a.id) ? 0 : 1;
                        const bS = subscriptions.includes(b.id) ? 0 : 1;
                        return aS - bS;
                      }).map(celeb => (
                        <SelectItem key={celeb.id} value={celeb.id}>
                          {celeb.name} - {celeb.category}{subscriptions.includes(celeb.id) ? ' ★' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCelebrity && (
                  <div className="space-y-2">
                    <Label htmlFor="occasion">Select Occasion</Label>
                    <Select value={selectedOccasion} onValueChange={setSelectedOccasion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an occasion" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOccasions.map(occasion => (
                          <SelectItem key={occasion.id} value={occasion.id}>
                            {occasion.occasion_name} - {new Date(occasion.occasion_date).toLocaleDateString()}
                            {occasion.auto_reply_enabled && " 🤖"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filteredOccasions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No upcoming occasions for this celebrity
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Your Wish Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Write your heartfelt wish message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length} / 500 characters
                  </p>
                </div>

                {selectedOccasion && celebrityOccasions.find(o => o.id === selectedOccasion)?.auto_reply_enabled && (
                  <div className="p-3 bg-primary/10 rounded-lg flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                    <p className="text-sm text-primary">
                      This celebrity has AI auto-reply enabled. You'll receive a personalized response!
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleSendWish} 
                  disabled={sending || !selectedCelebrity || !selectedOccasion || !message.trim()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send Wish"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishes History Tab */}
          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading wishes...</div>
            ) : sentWishes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You haven't sent any wishes yet</p>
                </CardContent>
              </Card>
            ) : (
              sentWishes.map(wish => (
                <Card key={wish.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={wish.celebrity_occasions.celebrities.image_url}
                          alt={wish.celebrity_occasions.celebrities.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {wish.celebrity_occasions.celebrities.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            {wish.celebrity_occasions.occasion_type === 'birthday' && <Cake className="w-4 h-4" />}
                            {wish.celebrity_occasions.occasion_type === 'anniversary' && <Heart className="w-4 h-4" />}
                            {wish.celebrity_occasions.occasion_type === 'other' && <Gift className="w-4 h-4" />}
                            {wish.celebrity_occasions.occasion_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant={wish.reply_message ? "default" : "secondary"}>
                        {wish.reply_message ? "Replied" : "Sent"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Your Wish:</p>
                      <p className="text-sm text-muted-foreground">{wish.message}</p>
                    </div>
                    {wish.reply_message && (
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Reply from {wish.celebrity_occasions.celebrities.name}:
                        </p>
                        <p className="text-sm">{wish.reply_message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(wish.reply_sent_at!).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sent on {new Date(wish.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
