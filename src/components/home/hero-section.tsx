import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Play, Star, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CelebrityVideo {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  type: 'wish' | 'product';
  fileKey?: string;
}

export const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<CelebrityVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<CelebrityVideo | null>(null);
  const [topCelebrityImages, setTopCelebrityImages] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCelebritiesWithVideos();
    // Fetch top celebrity images for social proof
    supabase
      .from('celebrities')
      .select('image_url')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setTopCelebrityImages(data.map(c => c.image_url).filter(Boolean) as string[]);
        }
      });
  }, []);

  const fetchCelebritiesWithVideos = async () => {
    try {
      const { data: bannerData } = await supabase
        .from('media_library')
        .select('*')
        .eq('file_type', 'video')
        .eq('category', 'banner')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (bannerData && bannerData.length > 0) {
        const bannerVideos = bannerData.map((media) => ({
          id: media.id,
          name: media.title,
          category: media.description || 'Featured',
          thumbnail: '',
          type: 'product' as const,
          fileKey: media.file_key
        }));
        setVideos(bannerVideos);
      } else {
        const { data: celebData } = await supabase
          .from('celebrities')
          .select('*')
          .eq('is_active', true)
          .eq('is_verified', true)
          .or('consent_status.neq.rejected,consent_status.is.null')
          .order('rating', { ascending: false })
          .limit(6);

        if (celebData && celebData.length > 0) {
          const { data: mediaData } = await supabase
            .from('celebrity_media')
            .select('*')
            .in('celebrity_id', celebData.map(c => c.id))
            .eq('is_public', true)
            .eq('media_type', 'video');

          const celebsWithVideos = celebData.map((celeb) => {
            const celebMedia = mediaData?.filter(m => m.celebrity_id === celeb.id) || [];
            return {
              id: celeb.id,
              name: celeb.name,
              category: celeb.category,
              thumbnail: celebMedia[0]?.thumbnail_url || celeb.image_url || '',
              type: 'wish' as const,
              fileKey: undefined
            };
          });
          setVideos(celebsWithVideos);
        } else {
          setVideos([
            { id: '1', name: "Bollywood Star", category: "Actor", thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop", type: 'wish' },
            { id: '2', name: "Cricket Legend", category: "Sports", thumbnail: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop", type: 'wish' },
            { id: '3', name: "Fashion Icon", category: "Model", thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop", type: 'product' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching celebrities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/celebrities?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/celebrities');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const getVisibleVideos = () => {
    if (videos.length === 0) return [];
    const visible = [];
    for (let i = 0; i < Math.min(3, videos.length); i++) {
      const index = (currentIndex + i) % videos.length;
      visible.push({ ...videos[index], position: i });
    }
    return visible;
  };

  if (loading) {
    return (
      <section className="relative min-h-[100vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0E1A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col overflow-hidden bg-[#0A0E1A]">
      {/* Background gradient orbs */}
      <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-bl from-purple-900/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-pink-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Main content area */}
      <div className="container mx-auto px-4 sm:px-6 flex-1 flex items-center relative z-10 py-12 md:py-0">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center w-full">
          
          {/* Left Content */}
          <div className="space-y-6 md:space-y-8">
            {/* Rating badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-fade-in">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-white">4.9/5 RATING</span>
              <span className="text-white/40">·</span>
              <span className="text-sm text-white/60">Trusted by 50k+ Fans</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="block bg-gradient-to-r from-[#FF6B33] via-[#EC4899] to-[#B44CFF] bg-clip-text text-transparent italic">
                Personalized
              </span>
              <span className="block text-white italic">
                videos from
              </span>
              <span className="block text-white italic">
                your favorite
              </span>
              <span className="block bg-gradient-to-r from-[#FF6B33] via-[#EC4899] to-[#B44CFF] bg-clip-text text-transparent italic">
                celebrities
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-white/50 max-w-lg italic font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Experience the magic of a bespoke message from the stars of Bollywood and beyond, curated just for you.
            </p>

            {/* CTA + Search row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#FF6B33] via-[#EC4899] to-[#B44CFF] hover:opacity-90 text-white text-base font-semibold px-8 py-6 rounded-full shadow-2xl shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all touch-manipulation whitespace-nowrap"
                asChild
              >
                <Link to="/celebrities">
                  Book a Celebrity
                </Link>
              </Button>

              <div className="relative flex items-center flex-1 min-w-0 z-20">
                <Search className="absolute left-4 h-4 w-4 text-white/40 pointer-events-none z-10" />
                <Input
                  placeholder="Search actor, singer, athlete..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-11 pr-24 h-12 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 focus:bg-white/15 transition-colors relative z-0 caret-white"
                />
                <Button
                  size="sm"
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm px-5 h-9 z-10"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Bottom social proof */}
            <div className="flex items-center gap-3 pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex -space-x-2">
                {topCelebrityImages.length > 0 ? topCelebrityImages.map((url, i) => (
                  <img key={i} src={url} alt="Celebrity" className="w-8 h-8 rounded-full border-2 border-[#0A0E1A] object-cover" loading="lazy" />
                )) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 border-2 border-[#0A0E1A]" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 border-2 border-[#0A0E1A]" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border-2 border-[#0A0E1A]" />
                  </>
                )}
              </div>
              <span className="text-sm text-white/50">
                Join <span className="text-white font-semibold">2,400+</span> artists already on WishMe
              </span>
            </div>
          </div>

          {/* Right Video Carousel */}
          <div className="relative mt-8 lg:mt-0">
            <div className="flex items-center justify-center gap-2 md:gap-4 p-4 md:p-6 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/5">
              {/* Previous Button */}
              <button
                onClick={prevSlide}
                className="p-2 md:p-3 rounded-full border-2 border-[#FFA500] text-[#FFA500] hover:bg-[#FFA500] hover:text-white transition-all z-20 flex-shrink-0"
                aria-label="Previous video"
              >
                <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
              </button>

              {/* Video Cards */}
              <div className="relative flex gap-2 md:gap-4 items-center justify-center overflow-hidden">
                {getVisibleVideos().map((video, idx) => (
                  <div
                    key={`${video.id}-${idx}`}
                    className={`relative rounded-xl md:rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer ${
                      idx === 1
                        ? 'w-40 h-56 sm:w-48 sm:h-72 md:w-64 md:h-96 z-10 scale-105 md:scale-110 shadow-2xl'
                        : 'w-28 h-40 sm:w-36 sm:h-52 md:w-48 md:h-72 opacity-60 scale-90'
                    }`}
                    onClick={() => setActiveVideo(video)}
                  >
                    {video.fileKey ? (
                      <B2VideoPlayer
                        fileKey={video.fileKey}
                        controls={false}
                        autoPlay={true}
                        muted={true}
                        loop={true}
                        preload={idx === 1 ? "metadata" : "none"}
                        lazy={idx !== 1}
                        className="w-full h-full object-cover rounded-xl md:rounded-2xl pointer-events-none"
                      />
                    ) : video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Celebrity Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 text-white pointer-events-none">
                      <h3 className="font-bold text-xs md:text-sm mb-0.5 md:mb-1 truncate">{video.name}</h3>
                      <p className="text-[10px] md:text-xs text-pink-400 truncate">{video.category}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextSlide}
                className="p-2 md:p-3 rounded-full border-2 border-[#FFA500] text-[#FFA500] hover:bg-[#FFA500] hover:text-white transition-all z-20 flex-shrink-0"
                aria-label="Next video"
              >
                <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
              </button>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-1.5 md:gap-2 mt-4 md:mt-6">
              {videos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 md:h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-[#FFA500] w-6 md:w-8'
                      : 'bg-gray-500 w-1.5 md:w-2'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to explore indicator */}
      <div className="relative z-10 flex flex-col items-center gap-2 pb-6 md:pb-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <span className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-white/30 font-medium">
          Scroll to Explore
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-pink-500 to-transparent" />
      </div>

      {/* Video Fullscreen Modal */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-[calc(100vw-16px)] md:max-w-4xl p-0 bg-black border-none [&>button]:hidden">
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative aspect-video w-full">
            {activeVideo?.fileKey ? (
              <B2VideoPlayer
                fileKey={activeVideo.fileKey}
                controls={true}
                autoPlay={true}
                muted={false}
                loop={false}
                preload="auto"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : activeVideo?.thumbnail ? (
              <img src={activeVideo.thumbnail} alt={activeVideo.name} className="w-full h-full object-contain" />
            ) : null}
          </div>
          <div className="px-4 py-3 text-white">
            <h3 className="font-semibold text-lg">{activeVideo?.name}</h3>
            <p className="text-sm text-white/60">{activeVideo?.category}</p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
