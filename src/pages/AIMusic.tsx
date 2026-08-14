import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Music, Mic, PenTool, Headphones, Sparkles, Play, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const musicFeatures = [
  {
    icon: PenTool,
    title: "AI Lyrics Generator",
    description: "Create meaningful, rhyming lyrics for any genre with our advanced AI technology."
  },
  {
    icon: Music,
    title: "Custom Compositions",
    description: "Generate unique melodies and beats tailored to your preferred style and mood."
  },
  {
    icon: Mic,
    title: "Voice Synthesis",
    description: "Choose from various AI voices to bring your songs to life with professional quality."
  },
  {
    icon: Headphones,
    title: "Professional Mixing",
    description: "Get studio-quality sound with AI-powered mixing and mastering tools."
  }
];

const musicGenres = [
  "Pop", "Hip Hop", "Rock", "Electronic", "R&B", "Country", "Jazz", "Classical", "Reggae", "Folk"
];

const musicPlans = [
  {
    name: "Creator",
    price: "₹499/month",
    description: "Perfect for aspiring musicians",
    features: ["5 songs per month", "Basic AI voices", "MP3 download", "Personal use license"],
    popular: false
  },
  {
    name: "Artist",
    price: "₹1,499/month", 
    description: "For serious music creators",
    features: ["20 songs per month", "Premium AI voices", "WAV + MP3 download", "Commercial license", "Priority support"],
    popular: true
  },
  {
    name: "Producer",
    price: "₹3,999/month",
    description: "For professional studios",
    features: ["Unlimited songs", "All AI voices", "Multi-format export", "Extended commercial license", "API access", "Dedicated support"],
    popular: false
  }
];

export default function AIMusic() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="min-h-screen bg-background">
      
      {/* Mobile Native Design */}
      <div className="md:hidden mobile-safe-bottom">
        <div className="pt-16 pb-8 px-4">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-background-secondary/80 backdrop-blur-sm border border-border text-xs font-medium">
              <Sparkles className="w-3 h-3 text-primary mr-1" />
              AI Music Studio
            </div>
            <h1 className="text-3xl font-bold leading-tight">
              <span className="text-foreground">Create Music with</span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">AI Magic</span>
            </h1>
            <p className="text-muted-foreground text-sm px-2">
              Generate lyrics, compose melodies with artificial intelligence
            </p>
            <Button 
              className="w-full bg-gradient-primary hover:bg-primary-dark text-primary-foreground py-3"
              onClick={() => navigate('/music-studio')}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Creating
            </Button>
          </div>
        </div>

        {/* Mobile Features */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            AI Music Features
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {musicFeatures.map((feature, index) => (
              <div key={index} className="rounded-2xl border border-border/50 bg-card p-4 flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm leading-tight mb-1">{feature.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Genres */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4">Supported Genres</h2>
          <div className="flex flex-wrap gap-2">
            {musicGenres.slice(0, 8).map((genre, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Mobile Plans */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4">Music Plans</h2>
          <div className="space-y-3">
            {musicPlans.map((plan, index) => (
              <div key={index} className={`mobile-card p-4 ${plan.popular ? 'border-primary' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-lg font-bold text-primary">{plan.price}</div>
                </div>
                <div className="space-y-1 mb-3">
                  {plan.features.slice(0, 2).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-xs">
                      <Music className="w-3 h-3 text-primary mr-1" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="w-full" variant={plan.popular ? "default" : "outline"} onClick={() => navigate('/music-studio')}>
                  {plan.popular ? "Start Free Trial" : "Get Started"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Design */}
      <div className="hidden md:block">
        {/* Hero Section */}
        <section className="pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Music Studio
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-foreground">Create Music with </span>
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  AI Magic
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Transform your ideas into complete songs. Generate lyrics, compose melodies, 
                and produce professional-quality music with the power of artificial intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:bg-primary-dark text-primary-foreground px-8"
                  onClick={() => navigate('/music-studio')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Creating
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-primary/30 hover:border-primary">
                  <Headphones className="w-5 h-5 mr-2" />
                  Listen to Samples
                </Button>
              </div>
            </div>
          </div>
        </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">AI Music </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create professional music from concept to completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {musicFeatures.map((feature, index) => (
              <Card key={index} className="text-center group hover:shadow-card transition-all duration-300">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Genres Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">Supported </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Genres</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create music in any style you love. Our AI understands the nuances of every genre.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {musicGenres.map((genre, index) => (
              <Badge key={index} variant="secondary" className="text-base px-6 py-3 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">How AI Music </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Creation Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold mb-2">Describe Your Vision</h3>
              <p className="text-sm text-muted-foreground">Tell us the genre, mood, and theme for your song</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <h3 className="font-semibold mb-2">AI Creates</h3>
              <p className="text-sm text-muted-foreground">Our AI generates lyrics, melody, and arrangement</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <h3 className="font-semibold mb-2">Customize & Refine</h3>
              <p className="text-sm text-muted-foreground">Edit lyrics, adjust instruments, and fine-tune your track</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <h3 className="font-semibold mb-2">Download & Share</h3>
              <p className="text-sm text-muted-foreground">Get your finished song and share it with the world</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">Music Creation </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Plans</span>
            </h2>
            <p className="text-lg text-muted-foreground">Choose the perfect plan for your music creation journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {musicPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-card' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-4xl font-bold text-primary">{plan.price}</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Music className="w-4 h-4 text-primary mr-2" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} onClick={() => navigate('/music-studio')}>
                    {plan.popular ? "Start Free Trial" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Tracks */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">AI-Generated </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Sample Tracks</span>
            </h2>
            <p className="text-lg text-muted-foreground">Listen to what our AI can create for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Sunset Dreams", genre: "Pop", duration: "3:24" },
              { title: "City Lights", genre: "Electronic", duration: "4:12" },
              { title: "Country Road", genre: "Country", duration: "3:45" },
              { title: "Jazz Café", genre: "Jazz", duration: "4:33" },
              { title: "Rock Anthem", genre: "Rock", duration: "3:58" },
              { title: "Chill Vibes", genre: "Lo-Fi", duration: "2:47" }
            ].map((track, index) => (
              <Card key={index} className="hover:shadow-card transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{track.title}</CardTitle>
                      <CardDescription>{track.genre}</CardDescription>
                    </div>
                    <Badge variant="secondary">{track.duration}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      </div>
      </div>
    </AuthenticatedLayout>
  );
}