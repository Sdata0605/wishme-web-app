import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import heroBackground from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </div>

      {/* Content */}
      <div className="container relative z-10 flex flex-col items-center justify-center min-h-[600px] py-20 text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Personalized Celebrity Wishes</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Make Every Moment{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Unforgettable
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Book personalized video wishes from your favorite celebrities. Perfect for birthdays, 
            anniversaries, and special occasions.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search for celebrities, categories, or occasions..."
              className="pl-12 pr-32 h-14 text-base rounded-xl border-border/50 bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
            />
            <Button 
              variant="gradient" 
              size="lg" 
              className="absolute right-1.5 top-1.5 bottom-1.5"
            >
              Search
            </Button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button variant="hero" size="xl" className="min-w-[200px]">
            Browse Celebrities
          </Button>
          <Button variant="outline" size="xl" className="min-w-[200px] bg-background/60 backdrop-blur-sm hover:bg-background/80">
            How It Works
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 pt-8 max-w-2xl w-full">
          <div className="space-y-1">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">500+</div>
            <div className="text-sm text-muted-foreground">Celebrities</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">50K+</div>
            <div className="text-sm text-muted-foreground">Happy Customers</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">4.9</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
