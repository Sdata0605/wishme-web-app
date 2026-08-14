import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

interface Occasion {
  id: string;
  name: string;
  description: string;
  date: string;
  image_url: string;
  is_featured: boolean;
}

export default function Occasions() {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOccasions();
  }, []);

  const fetchOccasions = async () => {
    try {
      const { data, error } = await supabase
        .from("occasions")
        .select("*")
        .eq("is_active", true)
        .order("date", { ascending: true });

      if (error) throw error;
      setOccasions(data || []);
    } catch (error) {
      console.error("Error fetching occasions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookOccasion = (occasionId: string) => {
    navigate(`/occasions/${occasionId}/book`);
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">Loading occasions...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Celebrate Special Occasions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Make every occasion memorable with personalized celebrity wishes and greetings
          </p>
        </div>

        {/* Featured Occasions Banner */}
        {occasions.some((o) => o.is_featured) && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Featured Occasions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {occasions
                .filter((o) => o.is_featured)
                .map((occasion) => (
                  <Card
                    key={occasion.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleBookOccasion(occasion.id)}
                  >
                    {occasion.image_url && (
                      <div className="relative h-64">
                        <img
                          src={occasion.image_url}
                          alt={`${occasion.name} - Special Occasion`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className="text-2xl font-bold mb-2">{occasion.name}</h3>
                          <p className="text-sm opacity-90">{occasion.description}</p>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(occasion.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <Button className="bg-gradient-primary hover:opacity-90">
                          Book Now
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* All Occasions */}
        <div>
          <h2 className="text-2xl font-bold mb-6">All Upcoming Occasions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {occasions.map((occasion) => (
              <Card
                key={occasion.id}
                className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                onClick={() => handleBookOccasion(occasion.id)}
              >
                {occasion.image_url && (
                  <div className="relative h-48">
                    <img
                      src={occasion.image_url}
                      alt={`${occasion.name} - Special Occasion`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{occasion.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {occasion.description}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(occasion.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookOccasion(occasion.id);
                    }}
                  >
                    Book for Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-primary text-white rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Book UNLIMITED celebrity videos for every occasion for FREE
          </h3>
          <p className="text-lg opacity-90">
            Choose from 50+ celebrities & 300+ occasions
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
