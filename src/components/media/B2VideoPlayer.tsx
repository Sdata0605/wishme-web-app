import { useState, useEffect, useRef } from "react";
import { Loader } from "@/components/ui/loader";

interface B2VideoPlayerProps {
  fileKey: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  poster?: string;
  fallbackUrl?: string;
  preload?: "none" | "metadata" | "auto";
  lazy?: boolean;
}

const B2_PUBLIC_URL = "https://f005.backblazeb2.com/file/wishmetoday";

export const B2VideoPlayer = ({
  fileKey,
  autoPlay = false,
  controls = true,
  loop = false,
  muted = false,
  className = "",
  poster,
  fallbackUrl,
  preload = "metadata",
  lazy = false,
}: B2VideoPlayerProps) => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isVisible, setIsVisible] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    
    try {
      setLoading(true);
      setError("");

      if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
        setVideoUrl(fileKey);
      } else if (fileKey) {
        setVideoUrl(`${B2_PUBLIC_URL}/${fileKey}`);
      } else if (fallbackUrl) {
        setVideoUrl(fallbackUrl);
      } else {
        setError("Video is temporarily unavailable");
      }
    } catch (err: any) {
      console.error("Error loading video:", err);
      if (fallbackUrl) {
        setVideoUrl(fallbackUrl);
      } else {
        setError("Video is temporarily unavailable");
      }
    } finally {
      setLoading(false);
    }
  }, [fileKey, fallbackUrl, isVisible]);

  // Lazy placeholder
  if (lazy && !isVisible) {
    return (
      <div
        ref={containerRef}
        className={`w-full bg-muted rounded-lg ${className}`}
        style={{ aspectRatio: "16/9" }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-muted rounded-lg">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">No video available</p>
      </div>
    );
  }

  return (
    <video
      key={videoUrl}
      src={videoUrl}
      autoPlay={autoPlay}
      controls={controls}
      loop={loop}
      muted={muted}
      poster={poster}
      preload={preload}
      playsInline
      crossOrigin="anonymous"
      className={`w-full rounded-lg ${className}`}
      onError={() => {
        if (fallbackUrl && videoUrl !== fallbackUrl) {
          setVideoUrl(fallbackUrl);
        } else {
          setError("Video is temporarily unavailable. Please try again later.");
        }
      }}
    >
      Your browser does not support the video tag.
    </video>
  );
};
