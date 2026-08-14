import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import logo from "@/assets/wish-me-logo.png";
import splashFriend from "@/assets/splash-wish-friend-updated.jpg";
import splashCelebrity from "@/assets/splash-celebrity-updated.jpg";
import splashPromotion from "@/assets/splash-promotion-updated.jpg";
import splashUGC from "@/assets/splash-ugc-updated.jpg";

const SPLASH_SCREENS = [
  {
    title: "Wish a Friend",
    description: "Send personalized video wishes to your loved ones",
    image: splashFriend
  },
  {
    title: "Wish a Celebrity",
    description: "Get personalized video messages from your favorite celebrities",
    image: splashCelebrity
  },
  {
    title: "Make Promotion Ads",
    description: "Create professional promotion videos with celebrity endorsements",
    image: splashPromotion
  },
  {
    title: "UGC Videos",
    description: "User-generated content videos with celebrity collaborations",
    image: splashUGC
  }
];

interface MobileSplashScreenProps {
  isAuthenticated: boolean;
}

export function MobileSplashScreen({ isAuthenticated }: MobileSplashScreenProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Preload all images
  useEffect(() => {
    const images = [splashFriend, splashCelebrity, splashPromotion, splashUGC];
    let loadedCount = 0;
    
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          setImagesLoaded(true);
        }
      };
    });
  }, []);

  useEffect(() => {
    // Wait for mobile detection to complete
    if (isMobile === undefined) {
      return;
    }

    // Show only on mobile and when user is NOT authenticated
    if (!isMobile || isAuthenticated) {
      setIsVisible(false);
      return;
    }

    // Logo screen (5 seconds)
    if (currentScreen === 0) {
      const timer = setTimeout(() => {
        setCurrentScreen(1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isMobile, isAuthenticated]);

  const handleNext = () => {
    if (currentScreen < 4) {
      setCurrentScreen(currentScreen + 1);
    } else {
      setIsVisible(false);
    }
  };

  // Don't render while mobile detection is in progress
  if (isMobile === undefined) {
    return null;
  }

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background">
      {/* Video Intro Screen */}
      {currentScreen === 0 && (
        <div className="flex items-center justify-center h-full bg-background">
          <video 
            src="/intro-video.mp4" 
            autoPlay 
            muted 
            playsInline
            onEnded={() => setCurrentScreen(1)}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Service Screens */}
      {currentScreen >= 1 && currentScreen <= 4 && (
        <div className="relative flex flex-col h-full animate-in fade-in-50 duration-700">
          {/* Background Image with Loading State */}
          <div className="absolute inset-0">
            {imagesLoaded ? (
              <>
                <img 
                  src={SPLASH_SCREENS[currentScreen - 1].image} 
                  alt={SPLASH_SCREENS[currentScreen - 1].title}
                  className="w-full h-full object-cover object-center animate-in zoom-in-95 duration-1000"
                />
                {/* Gradient overlay with vignette effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/98 via-background/20 to-background/40 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background/30 pointer-events-none" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Logo - Top Left */}
          <div className="absolute top-6 left-6 z-10 animate-in fade-in duration-700">
            <img 
              src={logo} 
              alt="WishMe Logo" 
              className="h-10 w-auto drop-shadow-lg"
            />
          </div>

          {/* Progress Indicator - Top Right as "1/4" format */}
          <div className="absolute top-6 right-20 z-10 animate-in fade-in duration-700">
            <div className="px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-foreground/10">
              <span className="text-sm font-semibold text-foreground">
                {currentScreen}/4
              </span>
            </div>
          </div>

          {/* Skip Button - Top Right */}
          <button
            onClick={() => {
              setIsVisible(false);
            }}
            className="absolute top-6 right-6 z-10 px-3 py-1.5 rounded-full bg-background/30 backdrop-blur-md text-foreground hover:bg-background/50 text-xs font-medium transition-all duration-300 border border-foreground/10 hover:border-foreground/30"
          >
            Skip
          </button>

          {/* Content - Positioned at absolute bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-background/98 via-background/95 to-transparent backdrop-blur-sm">
            <div className="text-center space-y-3 max-w-md mx-auto mb-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
              <h2 className="text-4xl font-bold text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {SPLASH_SCREENS[currentScreen - 1].title}
              </h2>
              <p className="text-lg text-foreground/90 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {SPLASH_SCREENS[currentScreen - 1].description}
              </p>
            </div>

            {/* Continue Button */}
            <div className="w-full animate-in fade-in duration-700 delay-700">
              <Button 
                onClick={handleNext}
                size="default"
                className="w-full text-base h-12 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              >
                {currentScreen === 4 ? "Skip" : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
