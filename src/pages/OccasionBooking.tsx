import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, Image as ImageIcon, Loader2 } from "lucide-react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ServiceGuide } from "@/components/ui/service-guide";
import { occasionBookingGuide } from "@/data/service-guides";

interface Occasion {
  id: string;
  name: string;
  description: string;
  date: string;
  image_url: string;
}

interface Celebrity {
  id: string;
  name: string;
  image_url: string;
  category: string;
  service_prices: any;
}

export default function OccasionBooking() {
  const { occasionId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [selectedCelebrity, setSelectedCelebrity] = useState<string>("");
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<"video" | "greeting_card">("video");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    message: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOccasionAndCelebrities();
  }, [occasionId, user]);

  useEffect(() => {
    if (profile?.id) {
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

  const fetchOccasionAndCelebrities = async () => {
    try {
      const [occasionRes, celebritiesRes] = await Promise.all([
        supabase.from("occasions").select("*").eq("id", occasionId).single(),
        supabase
          .from("celebrities")
          .select("id, name, image_url, category, service_prices")
          .eq("is_active", true)
          .eq("is_verified", true)
          .or('consent_status.neq.rejected,consent_status.is.null')
          .order("name")
      ]);

      if (occasionRes.error) throw occasionRes.error;
      if (celebritiesRes.error) throw celebritiesRes.error;

      setOccasion(occasionRes.data);
      setCelebrities(deduplicateCelebrities(celebritiesRes.data || []));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/occasions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCelebrity) {
      toast({
        title: "Error",
        description: "Please select a celebrity",
        variant: "destructive",
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Error",
        description: "Profile not found",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const selectedCelebrityData = celebrities.find(c => c.id === selectedCelebrity);
      const price = selectedCelebrityData?.service_prices?.general_wish || 0;

      const { data, error } = await supabase
        .from("occasion_bookings")
        .insert([
          {
            user_id: profile.id,
            occasion_id: occasionId,
            celebrity_id: selectedCelebrity,
            booking_type: bookingType,
            recipient_name: formData.recipientName,
            recipient_email: formData.recipientEmail,
            recipient_phone: formData.recipientPhone,
            message: formData.message,
            price: price,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Trigger AI generation
      if (bookingType === "video") {
        await generateAIVideo(data.id);
      } else {
        await generateGreetingCard(data.id);
      }

      toast({
        title: "Success",
        description: "Your booking has been created! AI is generating your content...",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const generateAIVideo = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-occasion-video", {
        body: {
          bookingId,
          occasionName: occasion?.name,
          recipientName: formData.recipientName,
          message: formData.message,
          celebrityId: selectedCelebrity,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error generating video:", error);
    }
  };

  const generateGreetingCard = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-greeting-card", {
        body: {
          bookingId,
          occasionName: occasion?.name,
          recipientName: formData.recipientName,
          message: formData.message,
          celebrityId: selectedCelebrity,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error generating greeting card:", error);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!occasion) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <p>Occasion not found</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{occasion.name}</h1>
          <p className="text-muted-foreground mb-4">{occasion.description}</p>

          <ServiceGuide {...occasionBookingGuide} className="mb-6" />

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Booking Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Booking Type</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={bookingType}
                  onValueChange={(value: any) => setBookingType(value)}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="video"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                  >
                    <RadioGroupItem value="video" id="video" className="sr-only" />
                    <Video className="mb-3 h-6 w-6" />
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium">AI Video</p>
                      <p className="text-xs text-muted-foreground">
                        Personalized video message
                      </p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="greeting_card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                  >
                    <RadioGroupItem
                      value="greeting_card"
                      id="greeting_card"
                      className="sr-only"
                    />
                    <ImageIcon className="mb-3 h-6 w-6" />
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium">Greeting Card</p>
                      <p className="text-xs text-muted-foreground">
                        Digital card with celebrity photo
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Celebrity Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Celebrity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...celebrities].sort((a, b) => {
                    const aS = subscriptions.includes(a.id) ? 0 : 1;
                    const bS = subscriptions.includes(b.id) ? 0 : 1;
                    return aS - bS;
                  }).map((celebrity) => (
                    <div
                      key={celebrity.id}
                      onClick={() => setSelectedCelebrity(celebrity.id)}
                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedCelebrity === celebrity.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={celebrity.image_url || "/placeholder.svg"}
                        alt={`${celebrity.name} - ${celebrity.category}`}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                        loading="lazy"
                        decoding="async"
                      />
                      <p className="text-sm font-medium text-center">{celebrity.name}</p>
                      <p className="text-xs text-muted-foreground text-center">
                        {celebrity.category}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recipient Details */}
            <Card>
              <CardHeader>
                <CardTitle>Recipient Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email (Optional)</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientEmail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="recipientPhone">Recipient Phone (Optional)</Label>
                  <Input
                    id="recipientPhone"
                    type="tel"
                    value={formData.recipientPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientPhone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="message">Your Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    placeholder="Write a personalized message..."
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
