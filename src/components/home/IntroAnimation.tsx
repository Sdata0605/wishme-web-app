import { useState, useEffect } from "react";
import { Star, Heart, Gift, Sparkles } from "lucide-react";

export function IntroAnimation() {
  // Disabled for now - page opens immediately
  return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center animate-fade-in">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating icons */}
      <div className="absolute top-20 left-20 animate-float">
        <Star className="w-12 h-12 text-primary animate-pulse" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '0.5s' }}>
        <Heart className="w-10 h-10 text-secondary animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-32 animate-float" style={{ animationDelay: '1s' }}>
        <Gift className="w-14 h-14 text-primary animate-pulse" />
      </div>
      <div className="absolute bottom-20 right-32 animate-float" style={{ animationDelay: '1.5s' }}>
        <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
      </div>

      {/* Main logo */}
      <div className="relative z-10 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl animate-pulse-slow"></div>
        
        {/* Logo text */}
        <div className="relative">
          <h1 className="text-7xl md:text-9xl font-bold text-foreground mb-6 font-dancing">
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{ animationDelay: '0.1s' }}>W</span>
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{ animationDelay: '0.2s' }}>i</span>
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{ animationDelay: '0.3s' }}>s</span>
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{ animationDelay: '0.4s' }}>h</span>
            <span className="inline-block mx-4 text-foreground">✨</span>
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-secondary" style={{ animationDelay: '0.5s' }}>M</span>
            <span className="inline-block animate-bounce-slow drop-shadow-2xl text-secondary" style={{ animationDelay: '0.6s' }}>e</span>
          </h1>
          
          {/* Decorative underline */}
          <div className="relative">
            <svg className="w-96 h-20 mx-auto" viewBox="0 0 384 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 40 Q96 20, 192 40 T360 40" stroke="url(#gradient1)" strokeWidth="4" fill="none" className="animate-draw" strokeDasharray="500" strokeDashoffset="500" />
              
              <g transform="translate(180, 24)">
                <path d="M12 20 L4 8 L8 8 L12 4 L16 8 L20 8 L12 20" fill="url(#goldGradient)" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
                <circle cx="6" cy="8" r="2" fill="hsl(var(--primary))" className="animate-pulse" style={{ animationDelay: '1.7s' }} />
                <circle cx="12" cy="4" r="2" fill="hsl(var(--primary))" className="animate-pulse" style={{ animationDelay: '1.8s' }} />
                <circle cx="18" cy="8" r="2" fill="hsl(var(--primary))" className="animate-pulse" style={{ animationDelay: '1.9s' }} />
              </g>
              
              <circle cx="96" cy="36" r="3" fill="hsl(var(--primary))" className="animate-pulse" style={{ animationDelay: '1s' }} />
              <circle cx="192" cy="40" r="4" fill="hsl(var(--secondary))" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
              <circle cx="288" cy="36" r="3" fill="hsl(var(--primary))" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
              
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'hsl(var(--primary-dark))', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
