import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Link } from "react-router-dom";
import { Music, Mic, Wand2, Download, Sparkles, Library, ArrowRight } from "lucide-react";

const AIMusicCreation = () => {
  const features = [
    { icon: Wand2, title: "AI-Powered Generation", description: "Create unique music tracks using advanced AI technology", color: "from-orange-500 to-amber-500" },
    { icon: Mic, title: "Voice Cloning", description: "Generate songs in celebrity voices or upload your own", color: "from-purple-500 to-violet-500" },
    { icon: Music, title: "Multiple Genres", description: "Choose from pop, rock, jazz, electronic, and more", color: "from-cyan-500 to-blue-500" },
    { icon: Download, title: "Instant Download", description: "Download your generated music in high-quality formats", color: "from-pink-500 to-rose-500" },
  ];

  const howItWorks = [
    { step: "01", title: "Choose Your Style", description: "Select genre, mood, and style preferences" },
    { step: "02", title: "Add Lyrics or Instrumental", description: "Provide lyrics or create instrumental tracks" },
    { step: "03", title: "Select Voice", description: "Choose from celebrity voices or upload your own" },
    { step: "04", title: "Generate & Download", description: "AI creates your song in minutes, ready to download" },
  ];

  const useCases = [
    { icon: Library, title: "Content Creators", description: "Create unique background music for videos, podcasts, and social media content", color: "from-orange-500 to-amber-500" },
    { icon: Music, title: "Musicians", description: "Experiment with new sounds and generate demo tracks for your projects", color: "from-purple-500 to-violet-500" },
    { icon: Sparkles, title: "Special Occasions", description: "Create personalized songs for birthdays, anniversaries, and celebrations", color: "from-pink-500 to-rose-500" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A14] text-white">
      <Header />
      
      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-purple-500/10 rounded-full blur-[120px]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-white/[0.06] border border-white/[0.08] text-gray-300 mb-6">
              AI Music Studio
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              Create{" "}
              <span className="italic bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Amazing Music</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Create professional-quality music with AI — No musical skills required
            </p>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 h-12 text-base font-semibold hover:opacity-90" asChild>
              <Link to="/music-studio">Start Creating <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Powerful Features</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Everything you need to create stunning music</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {howItWorks.map((item) => (
                <div key={item.step} className="text-center">
                  <span className="inline-block text-4xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">{item.step}</span>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Perfect For</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${uc.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{uc.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{uc.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Create Amazing Music?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">Start creating professional-quality music with AI today</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 hover:opacity-90" asChild>
                <Link to="/music-studio">Create Music</Link>
              </Button>
              <Button size="lg" className="bg-transparent border border-white/[0.12] text-white rounded-full px-8 hover:bg-white/[0.05]" asChild>
                <Link to="/my-music">View My Music</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AIMusicCreation;
