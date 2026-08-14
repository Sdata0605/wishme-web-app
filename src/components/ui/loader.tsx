import { useEffect, useState } from "react";
import { Sparkles, Heart, Star, Play, Gift } from "lucide-react";

interface LoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export function Loader({ onComplete, duration = 5000 }: LoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // 5 second intro phases
    const phases = [
      { delay: 0, phase: 0 },      // Initial fade in
      { delay: 500, phase: 1 },    // Logo appears
      { delay: 1500, phase: 2 },   // Content appears
      { delay: 3000, phase: 3 },   // Magic effects
      { delay: 4000, phase: 4 },   // Fade out preparation
    ];

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setAnimationPhase(phase), delay);
    });

    // Complete loading with fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary">
      {/* Magic Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            {i % 5 === 0 && <Sparkles className="w-2 h-2 text-white/30" />}
            {i % 5 === 1 && <Heart className="w-1.5 h-1.5 text-white/20" />}
            {i % 5 === 2 && <Star className="w-1.5 h-1.5 text-white/25" />}
            {i % 5 === 3 && <Gift className="w-2 h-2 text-white/20" />}
            {i % 5 === 4 && <div className="w-1 h-1 bg-white/15 rounded-full animate-pulse" />}
          </div>
        ))}
      </div>

      {/* Magical Aura Effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Logo Content */}
      <div className="relative z-10 text-center">
        
        {/* Phase 0-1: Logo Introduction */}
        <div 
          className={`transition-all duration-1000 ${
            animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {/* Premium Wish Me Logo */}
          <div className="relative mb-8">
            {/* Logo Container with Glow Effect */}
            <div className="relative">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-purple-500/30 to-yellow-400/30 blur-3xl animate-pulse-slow"></div>
              
              {/* Main Logo */}
              <div className="relative">
                <h1 className="text-7xl md:text-8xl font-bold text-white mb-6 font-dancing">
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-yellow-400" style={{ animationDelay: '0.1s' }}>W</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-yellow-300" style={{ animationDelay: '0.2s' }}>i</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-yellow-400" style={{ animationDelay: '0.3s' }}>s</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-yellow-300" style={{ animationDelay: '0.4s' }}>h</span>
                  <span className="inline-block mx-4 text-white">✨</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-purple-400" style={{ animationDelay: '0.5s' }}>M</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-purple-300" style={{ animationDelay: '0.6s' }}>e</span>
                </h1>
                
                {/* Elegant Underline with Crown Effect */}
                <div className="relative">
                  <svg
                    className="w-96 h-20 mx-auto"
                    viewBox="0 0 384 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Flowing magical line */}
                    <path
                      d="M20 40 Q96 20, 192 40 T364 40"
                      stroke="url(#gradient1)"
                      strokeWidth="4"
                      fill="none"
                      className="animate-draw"
                      strokeDasharray="500"
                      strokeDashoffset="500"
                    />
                    
                    {/* Crown in the center */}
                    <g transform="translate(180, 25)">
                      <path
                        d="M12 20 L4 8 L8 8 L12 4 L16 8 L20 8 L12 20"
                        fill="url(#goldGradient)"
                        className="animate-pulse"
                        style={{ animationDelay: '1.5s' }}
                      />
                      <circle cx="6" cy="8" r="2" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '1.7s' }} />
                      <circle cx="12" cy="4" r="2" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '1.8s' }} />
                      <circle cx="18" cy="8" r="2" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '1.9s' }} />
                    </g>
                    
                    {/* Magic sparkles */}
                    <circle cx="96" cy="35" r="3" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '1s' }} />
                    <circle cx="192" cy="40" r="4" fill="#A855F7" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
                    <circle cx="288" cy="35" r="3" fill="#FFD700" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
                    
                    {/* Additional sparkles */}
                    <circle cx="60" cy="50" r="2" fill="#FBBF24" className="animate-pulse" style={{ animationDelay: '2s' }} />
                    <circle cx="324" cy="50" r="2" fill="#C084FC" className="animate-pulse" style={{ animationDelay: '2.2s' }} />
                    
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#A855F7', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                      </linearGradient>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#FCD34D', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Subtitle Magic */}
        <div 
          className={`transition-all duration-1000 ${
            animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-2xl md:text-3xl text-white/90 mb-6 font-light">
            Where Magic Meets Reality
          </p>
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-16 h-0.5 bg-white/50"></div>
            <Star className="w-6 h-6 text-white animate-pulse" />
            <div className="w-16 h-0.5 bg-white/50"></div>
          </div>
        </div>

        {/* Phase 3: Final Magic Effects */}
        <div 
          className={`transition-all duration-1000 ${
            animationPhase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white/80">Loading Your Wishes</span>
            <Sparkles className="w-5 h-5 text-white animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Phase 4: Fade out preparation */}
        <div 
          className={`transition-all duration-2000 ${
            animationPhase >= 4 ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
        </div>
      </div>

      {/* Magic film grain effect */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none"></div>
    </div>
  );
}