import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoPlayerProps {
  thumbnailUrl: string;
  videoUrl?: string;
  title: string;
  type: 'wish' | 'product';
}

export const VideoPlayer = ({ thumbnailUrl, videoUrl, title, type }: VideoPlayerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsOpen(true);
    setIsPlaying(true);
  };

  return (
    <>
      {/* Video Thumbnail with Play Button */}
      <div 
        className="relative cursor-pointer group"
        onClick={handlePlay}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Play Button - Bottom Right */}
        <div className="absolute bottom-3 right-3">
          <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-all shadow-md">
            <Play className="w-5 h-5 text-[#0a1628] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
          {type === 'wish' ? '💝 Personal Wish' : '🎬 Product Promo'}
        </div>
      </div>

      {/* Video Player Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative aspect-video w-full">
            {isPlaying ? (
              videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-4">
                  <img
                    src={thumbnailUrl}
                    alt={title}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold">Sample Preview</p>
                      <p className="text-sm text-gray-300">
                        This is a preview of {title}'s personalized video message
                      </p>
                      <p className="text-xs text-gray-400">
                        {type === 'wish' ? 'Perfect for birthdays, anniversaries, and special occasions' : 'Great for product promotions'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
