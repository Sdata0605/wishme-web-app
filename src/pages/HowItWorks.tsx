import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Star, MessageSquare, Briefcase, Music, Search, CreditCard, Gift, Video, PenTool, Users } from "lucide-react";

const wishesSteps = [
  {
    icon: Search,
    title: "Choose Celebrity",
    description: "Browse our curated list of celebrities across different categories - actors, musicians, influencers, and more.",
    step: "01"
  },
  {
    icon: MessageSquare,
    title: "Customize Your Wish",
    description: "Select your preferred format (video, text, or AI card) and tell us about the occasion and recipient.",
    step: "02"
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "Complete your order with our secure payment system. We only charge when your wish is delivered.",
    step: "03"
  },
  {
    icon: Gift,
    title: "Receive & Share",
    description: "Get your personalized celebrity wish delivered within 24-72 hours, ready to share with your loved one.",
    step: "04"
  }
];

const businessSteps = [
  {
    icon: Briefcase,
    title: "Submit Campaign Brief",
    description: "Tell us about your brand, campaign goals, target audience, and preferred celebrity type.",
    step: "01"
  },
  {
    icon: Users,
    title: "Celebrity Selection",
    description: "Choose from our curated list of brand-safe celebrities that align with your campaign objectives.",
    step: "02"
  },
  {
    icon: Video,
    title: "Content Creation",
    description: "Celebrity creates your custom promotional content with professional quality and authenticity.",
    step: "03"
  },
  {
    icon: Star,
    title: "Campaign Launch",
    description: "Receive your content with full licensing rights for marketing use across all platforms.",
    step: "04"
  }
];

const musicSteps = [
  {
    icon: PenTool,
    title: "Describe Your Vision",
    description: "Tell us the genre, mood, theme, and any specific requirements for your AI-generated song.",
    step: "01"
  },
  {
    icon: Music,
    title: "AI Music Creation",
    description: "Our advanced AI generates lyrics, melody, arrangement, and produces your unique track.",
    step: "02"
  },
  {
    icon: MessageSquare,
    title: "Customize & Refine",
    description: "Edit lyrics, adjust instruments, change tempo, and fine-tune your track to perfection.",
    step: "03"
  },
  {
    icon: Gift,
    title: "Download & Share",
    description: "Get your finished song in multiple formats and share it with the world or use commercially.",
    step: "04"
  }
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Mobile Native Design */}
      <div className="md:hidden mobile-safe-bottom">
        <div className="pt-16 pb-8 px-4">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold leading-tight">
              <span className="text-foreground">How</span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">Wish Me Works</span>
            </h1>
            <p className="text-muted-foreground text-sm px-2">
              Create magical moments with celebrities, business campaigns, or AI music
            </p>
          </div>
        </div>

        {/* Mobile How It Works */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Celebrity Wishes
          </h2>
          <div className="space-y-3">
            {wishesSteps.map((step, index) => (
              <div key={index} className="mobile-card p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-foreground">{step.step}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Business */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4">Business Campaigns</h2>
          <div className="space-y-3">
            {businessSteps.slice(0, 2).map((step, index) => (
              <div key={index} className="mobile-card p-4">
                <div className="flex items-start space-x-3">
                  <step.icon className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile AI Music */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4">AI Music Creation</h2>
          <div className="space-y-3">
            {musicSteps.slice(0, 2).map((step, index) => (
              <div key={index} className="mobile-card p-4">
                <div className="flex items-start space-x-3">
                  <step.icon className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
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
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-foreground">How </span>
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Wish Me Works
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Discover how easy it is to create magical moments with celebrity wishes, 
                launch powerful business campaigns, or compose original music with AI.
              </p>
            </div>
          </div>
        </section>

      {/* Main Content */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="wishes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-16">
              <TabsTrigger value="wishes" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Celebrity Wishes
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Business
              </TabsTrigger>
              <TabsTrigger value="music" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                AI Music
              </TabsTrigger>
            </TabsList>

            {/* Celebrity Wishes Tab */}
            <TabsContent value="wishes">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Star className="w-4 h-4 mr-2" />
                  Celebrity Wishes
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  <span className="text-foreground">Get Personal </span>
                  <span className="bg-gradient-primary bg-clip-text text-transparent">Celebrity Wishes</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Create unforgettable moments with personalized video messages, text wishes, or AI-generated greeting cards from your favorite celebrities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {wishesSteps.map((step, index) => (
                  <Card 
                    key={step.step}
                    className="relative group bg-gradient-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-card"
                  >
                    <CardContent className="p-8 text-center">
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{step.step}</span>
                      </div>
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Business Campaigns
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  <span className="text-foreground">Amplify Your Brand with </span>
                  <span className="bg-gradient-primary bg-clip-text text-transparent">Celebrity Power</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Transform your marketing campaigns with authentic celebrity endorsements that boost credibility and drive engagement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {businessSteps.map((step, index) => (
                  <Card 
                    key={step.step}
                    className="relative group bg-gradient-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-card"
                  >
                    <CardContent className="p-8 text-center">
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{step.step}</span>
                      </div>
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* AI Music Tab */}
            <TabsContent value="music">
              <div className="text-center mb-16">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Music className="w-4 h-4 mr-2" />
                  AI Music Creation
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  <span className="text-foreground">Create Music with </span>
                  <span className="bg-gradient-primary bg-clip-text text-transparent">AI Magic</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Transform your ideas into complete songs with AI-powered lyrics generation, melody composition, and professional production.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {musicSteps.map((step, index) => (
                  <Card 
                    key={step.step}
                    className="relative group bg-gradient-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-card"
                  >
                    <CardContent className="p-8 text-center">
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{step.step}</span>
                      </div>
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-foreground">Choose Your </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Perfect Experience</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each service offers unique benefits tailored to different needs and occasions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-card transition-all duration-300">
              <CardHeader>
                <Star className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl">Celebrity Wishes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Personal occasions</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Video, text, or card format</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>24-72 hour delivery</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Perfect for gifts</li>
                </ul>
                <Button className="w-full">Start Your Wish</Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-card transition-all duration-300 border-primary">
              <CardHeader>
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl">Business Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Brand promotion</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Commercial licensing</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Professional quality</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Campaign consultation</li>
                </ul>
                <Button className="w-full">Launch Campaign</Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-card transition-all duration-300">
              <CardHeader>
                <Music className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl">AI Music</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Original compositions</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Any genre or style</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Instant generation</li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-2"></span>Commercial use rights</li>
                </ul>
                <Button className="w-full">Create Music</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Choose your perfect experience and create something magical today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8">
              Browse Celebrities
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary px-8">
              View Pricing Plans
            </Button>
          </div>
        </div>
      </section>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}