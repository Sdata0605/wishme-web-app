import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import { Loader } from "@/components/ui/loader";

interface FeaturedMedia {
  id: string;
  title: string;
  description: string | null;
  file_key: string;
}

export const FeaturedVideoSection = () => {
  const [featuredVideo, setFeaturedVideo] = useState<FeaturedMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedVideo();
  }, []);

  const fetchFeaturedVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("media_library")
        .select("id, title, description, file_key")
        .eq("file_type", "video")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching featured video:", error);
      } else {
        setFeaturedVideo(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no featured video
  if (loading) {
    return (
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader />
          </div>
        </div>
      </section>
    );
  }

  if (!featuredVideo) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {featuredVideo.title}
          </h2>
          {featuredVideo.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {featuredVideo.description}
            </p>
          )}
        </div>

        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50">
          <B2VideoPlayer
            fileKey={featuredVideo.file_key}
            controls
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
};
