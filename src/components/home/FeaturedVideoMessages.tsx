import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WishVideo {
  id: string;
  occasion: string;
  title: string;
  description: string;
  videoUrl: string;
}

const wishVideos: WishVideo[] = [
  {
    id: "graduation",
    occasion: "Graduation",
    title: "Celebrate Academic Success",
    description: "Create personalized video wishes to honor their achievement and inspire their next chapter. Make their graduation unforgettable with heartfelt messages.",
    videoUrl: "/videos/graduation-wish.mp4"
  },
  {
    id: "birthday",
    occasion: "Birthday",
    title: "Make Birthdays Special",
    description: "Send personalized video wishes that bring joy and laughter. Create magical moments with custom birthday messages from favorite celebrities.",
    videoUrl: "/videos/happy-birthday.mp4"
  },
  {
    id: "anniversary",
    occasion: "Anniversary",
    title: "Honor Love & Commitment",
    description: "Celebrate their special bond with personalized video wishes. Create beautiful memories with custom anniversary messages that touch hearts.",
    videoUrl: "/videos/wedding-anniversary.mp4"
  }
];

export const FeaturedVideoMessages = () => {
  const navigate = useNavigate();
  const [playingVideo, setPlayingVideo] = useState<WishVideo | null>(null);

  return (
    <>
      <section className="py-8 md:py-16 px-4 sm:px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 md:mb-12 space-y-2 md:space-y-4">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Personalized Video Wishes
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Create unforgettable moments with custom video messages for every special occasion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {wishVideos.map((wish) => (
              <Card 
                key={wish.id}
                className="group overflow-hidden active:scale-95 md:hover:shadow-xl transition-all duration-300 border-2 md:hover:border-primary/50 touch-manipulation shadow-md"
              >
                <CardContent className="p-0">
                  <div 
                    className="relative aspect-video overflow-hidden cursor-pointer"
                    onClick={() => setPlayingVideo(wish)}
                  >
                    {/* Video Thumbnail */}
                    <video
                      src={wish.videoUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform md:group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    
                    {/* Occasion Badge */}
                    <div className="absolute top-3 md:top-4 right-3 md:right-4 bg-primary/90 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 md:py-2 text-primary-foreground text-[10px] md:text-xs font-semibold">
                      {wish.occasion}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 md:p-6 space-y-3">
                    <div className="space-y-1.5 md:space-y-2">
                      <h3 className="text-base md:text-xl font-bold text-foreground line-clamp-1">
                        {wish.title}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                        {wish.description}
                      </p>
                    </div>

                    {/* CTA */}
                    <Button 
                      onClick={() => navigate('/celebrities')}
                      className="w-full mt-3 md:mt-4 group/btn touch-manipulation active:scale-95"
                      variant="default"
                      size="sm"
                    >
                      Create Your Wish
                      <ArrowRight className="ml-2 w-4 h-4 transition-transform md:group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* View All CTA */}
          <div className="text-center">
            <Button
              onClick={() => navigate('/celebrities')}
              size="lg"
              variant="outline"
              className="group touch-manipulation active:scale-95 w-full md:w-auto"
            >
              Explore All Occasions
              <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 transition-transform md:group-hover:translate-x-1" />
            </Button>
          </div>
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
              <video
                className="w-full h-full"
                src={playingVideo.videoUrl}
                controls
                autoPlay
                controlsList="nodownload"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
