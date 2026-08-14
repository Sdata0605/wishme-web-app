import { Button } from "@/components/ui/button";
import { Star, Play, Gift, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-background.jpg";
export function HeroSection() {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(${heroBackground})`
    }}>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{
        animationDelay: '1s'
      }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl animate-float"></div>
      </div>

      {/* Enhanced Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <Star className="w-8 h-8 text-primary animate-pulse" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{
      animationDelay: '1s'
    }}>
        <Heart className="w-6 h-6 text-secondary animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-20 animate-float" style={{
      animationDelay: '2s'
    }}>
        <Gift className="w-7 h-7 text-primary animate-pulse" />
      </div>
      <div className="absolute top-32 right-32 animate-bounce-slow">
        <Play className="w-5 h-5 text-secondary" />
      </div>
      <div className="absolute bottom-20 right-10 animate-bounce-slow" style={{
      animationDelay: '1.5s'
    }}>
        <Star className="w-4 h-4 text-primary" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        <div className="animate-fade-in">
          
          {/* Wish Me Logo - Same as Intro */}
          <div className="mb-8 animate-scale-in">
            <div className="relative">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl animate-pulse-slow"></div>
              
              {/* Main Logo */}
              <div className="relative">
                <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 font-dancing">
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{
                  animationDelay: '0.1s'
                }}>W</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{
                  animationDelay: '0.2s'
                }}>i</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{
                  animationDelay: '0.3s'
                }}>s</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-primary" style={{
                  animationDelay: '0.4s'
                }}>h</span>
                  <span className="inline-block mx-4 text-white">✨</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-secondary" style={{
                  animationDelay: '0.5s'
                }}>M</span>
                  <span className="inline-block animate-bounce-slow drop-shadow-2xl text-secondary" style={{
                  animationDelay: '0.6s'
                }}>e</span>
                </h1>
                
                {/* Elegant Underline with Crown Effect */}
                <div className="relative">
                  <svg className="w-80 h-16 mx-auto" viewBox="0 0 320 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Flowing magical line */}
                    <path d="M20 32 Q80 16, 160 32 T300 32" stroke="url(#gradient1)" strokeWidth="3" fill="none" className="animate-draw" strokeDasharray="400" strokeDashoffset="400" />
                    
                    {/* Crown in the center */}
                    <g transform="translate(150, 20)">
                      <path d="M10 16 L3 6 L6 6 L10 3 L14 6 L17 6 L10 16" fill="url(#goldGradient)" className="animate-pulse" style={{
                      animationDelay: '1.5s'
                    }} />
                      <circle cx="5" cy="6" r="1.5" fill="hsl(var(--primary))" className="animate-pulse" style={{
                      animationDelay: '1.7s'
                    }} />
                      <circle cx="10" cy="3" r="1.5" fill="hsl(var(--primary))" className="animate-pulse" style={{
                      animationDelay: '1.8s'
                    }} />
                      <circle cx="15" cy="6" r="1.5" fill="hsl(var(--primary))" className="animate-pulse" style={{
                      animationDelay: '1.9s'
                    }} />
                    </g>
                    
                    {/* Magic sparkles */}
                    <circle cx="80" cy="28" r="2" fill="hsl(var(--primary))" className="animate-pulse" style={{
                    animationDelay: '1s'
                  }} />
                    <circle cx="160" cy="32" r="3" fill="hsl(var(--secondary))" className="animate-pulse" style={{
                    animationDelay: '1.2s'
                  }} />
                    <circle cx="240" cy="28" r="2" fill="hsl(var(--primary))" className="animate-pulse" style={{
                    animationDelay: '1.4s'
                  }} />
                    
                    <defs>
                      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{
                        stopColor: 'hsl(var(--primary))',
                        stopOpacity: 1
                      }} />
                        <stop offset="50%" style={{
                        stopColor: 'hsl(var(--secondary))',
                        stopOpacity: 1
                      }} />
                        <stop offset="100%" style={{
                        stopColor: 'hsl(var(--primary))',
                        stopOpacity: 1
                      }} />
                      </linearGradient>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{
                        stopColor: 'hsl(var(--primary))',
                        stopOpacity: 1
                      }} />
                        <stop offset="100%" style={{
                        stopColor: 'hsl(var(--primary-dark))',
                        stopOpacity: 1
                      }} />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Wish Me Logo */}
          
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-background-secondary/80 backdrop-blur-sm border border-border mb-8 animate-scale-in hover:scale-105 transition-transform">
            <Star className="w-4 h-4 text-primary mr-2 animate-pulse" />
            <span className="text-sm font-medium">Premium Celebrity Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight font-playfair">
            <span className="text-foreground animate-fade-in">Send Wishes That</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-gradient-x">
              Last Forever
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Get personalized video messages, text wishes, and AI-generated greeting cards 
            from your favorite celebrities for any special occasion.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark text-primary-foreground px-8 py-4 text-lg font-semibold shadow-premium animate-scale-in hover:scale-105 hover:shadow-glow transition-all duration-300 group" asChild>
              <Link to="/celebrities">
                <Star className="w-5 h-5 mr-2 group-hover:animate-spin" />
                Find a Celebrity
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-2 border-primary/30 hover:border-primary hover:bg-primary/10 px-8 py-4 text-lg font-semibold animate-scale-in hover:scale-105 transition-all duration-300 group" asChild>
              <Link to="/how-it-works">
                <Play className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 text-primary fill-primary" />)}
              </div>
              <span className="text-sm text-muted-foreground">
                10,000+ Happy Customers
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Gift className="w-5 h-5 text-secondary" />
              <span className="text-sm text-muted-foreground">
                500+ Celebrities Available
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                24-48 Hour Delivery
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>;
}