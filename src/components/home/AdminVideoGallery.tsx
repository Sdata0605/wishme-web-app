import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaVideo {
  id: string;
  title: string;
  description: string | null;
  file_key: string;
}

export const AdminVideoGallery = () => {
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("media_library")
        .select("id, title, description, file_key")
        .eq("file_type", "video")
        .eq("category", "featured")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 px-4 md:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Featured Videos
            </h2>
            <p className="text-muted-foreground text-lg">
              Watch our latest promotional videos
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return (
      <section className="py-16 px-4 md:px-8 bg-background">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Featured Videos
          </h2>
          <p className="text-muted-foreground text-lg">
            No videos available at the moment
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 md:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Featured Videos
          </h2>
          <p className="text-muted-foreground text-lg">
            Watch our latest promotional videos
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {videos.map((video) => (
            <div key={video.id} className="group">
              <div className="aspect-[4/5] rounded-xl overflow-hidden bg-muted shadow-lg hover:shadow-xl transition-shadow">
                <B2VideoPlayer
                  fileKey={video.file_key}
                  controls={true}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 px-1">
                <h3 className="font-semibold text-foreground text-sm md:text-base line-clamp-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-muted-foreground text-xs md:text-sm mt-1 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
