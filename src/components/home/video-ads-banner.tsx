import { Play, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { B2VideoPlayer } from '@/components/media/B2VideoPlayer';
import { Skeleton } from '@/components/ui/skeleton';

interface TestimonialItem {
  id: string;
  title: string;
  description: string | null;
  file_key: string;
}

export const VideoAdsBanner = () => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<TestimonialItem | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('media_library')
          .select('id, title, description, file_key')
          .eq('file_type', 'video')
          .eq('category', 'testimonial')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTestimonials(data || []);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Hide section if no testimonials and not loading
  if (!loading && testimonials.length === 0) return null;

  return (
    <>
      <section className="py-8 md:py-12 bg-gradient-to-b from-background to-background-secondary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 bg-gradient-primary bg-clip-text text-transparent">
              What Our Customers Say
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              See real testimonials from our satisfied customers
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl md:rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {testimonials.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer active:scale-95 md:hover:scale-105 transition-transform duration-300 touch-manipulation shadow-lg"
                  onClick={() => setPlayingVideo(item)}
                >
                  {/* Video Thumbnail */}
                  <div className="absolute inset-0">
                    <B2VideoPlayer
                      fileKey={item.file_key}
                      muted
                      autoPlay
                      loop
                      controls={false}
                      className="w-full h-full object-cover"
                      lazy={true}
                      preload="none"
                    />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center group-active:scale-95 md:group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-20">
                    <h3 className="font-bold text-xs md:text-sm mb-0.5 md:mb-1 line-clamp-1 text-white">{item.title}</h3>
                    {item.description && (
                      <p className="text-[10px] md:text-xs text-white/90">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
          <div className="relative aspect-video">
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {playingVideo && (
              <B2VideoPlayer
                fileKey={playingVideo.file_key}
                controls
                autoPlay
                className="w-full h-full"
              />
            )}
          </div>

          {playingVideo && (
            <div className="p-4 bg-black text-white">
              <h3 className="font-bold text-lg">{playingVideo.title}</h3>
              {playingVideo.description && (
                <p className="text-sm text-gray-400">{playingVideo.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
