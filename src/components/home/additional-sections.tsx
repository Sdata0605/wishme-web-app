import { Button } from "@/components/ui/button";
import { Music, Star, Play, Sparkles, ArrowLeft, ArrowRight, Plus, ArrowUpRight, Crown, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import endorsementsBg from "@/assets/brand-endorsements-bg.jpg";
import viralCampaignsBg from "@/assets/viral-campaigns-bg.jpg";
import brandActivationsBg from "@/assets/brand-activations-bg.jpg";
import musicStudioBg from "@/assets/music-studio-bg.jpg";
import referralPhoneMockup from "@/assets/referral-phone-mockup.png";

const musicFeatures = [
  {
    icon: Music,
    title: "AI Song Creation",
    description: "From cinematic scores to chart-topping pop beats. Sophisticated composition that breathes life into your vision.",
    accent: "waveform" as const,
    iconBg: "bg-purple-900/60",
    iconColor: "text-pink-400",
  },
  {
    icon: Sparkles,
    title: "Lyrics Generator",
    description: "Harness LLM-powered poetry to generate rhyming, brand-aligned lyrics that resonate with global audiences.",
    accent: "quote" as const,
    quote: '"Whispers of neon under a velvet sky..."',
    iconBg: "bg-slate-700/60",
    iconColor: "text-amber-400",
  },
  {
    icon: Play,
    title: "Professional Quality",
    description: "Lossless 24-bit audio mastering that meets global broadcasting standards. Ready for the main stage.",
    accent: "badges" as const,
    badges: ["HIGH-RES AUDIO", "24-BIT MASTERING"],
    iconBg: "bg-emerald-900/50",
    iconColor: "text-emerald-400",
  }
];



export function BusinessSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 lg:py-28 relative overflow-hidden" style={{ background: '#0A0E1A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 md:mb-16 gap-6">
          <div>
            <span className="uppercase tracking-[0.25em] text-xs md:text-sm font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4 block">
              Brand Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Amplify Your{' '}
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Brand
              </span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 mt-4 max-w-xl leading-relaxed">
              Forge unforgettable connections between elite global icons and your audience.
              We transform traditional marketing into cultural phenomena.
            </p>
          </div>
          {/* Navigation Arrows */}
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-gray-400 hover:border-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Large Left Card - Celebrity Endorsements */}
          <div
            className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden min-h-[240px] md:min-h-[400px] flex flex-col justify-end p-6 md:p-8 cursor-pointer group hover:border-white/20 transition-colors duration-300"
            onClick={() => navigate('/celebrities')}
          >
            {/* Background image */}
            <img src={endorsementsBg} alt="" className="absolute inset-0 w-full h-full object-cover z-0" loading="lazy" width={960} height={640} />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/80 to-[#0A0E1A]/40 z-[1]" />

            {/* Icon */}
            <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>

            <h3 className="relative z-10 text-xl md:text-2xl font-bold text-white mb-2">
              Celebrity Endorsements
            </h3>
            <p className="relative z-10 text-sm text-gray-400 leading-relaxed mb-6 max-w-sm">
              Access our curated network of A-list talent for exclusive partnerships that resonate globally.
            </p>
            <span className="relative z-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              Explore Roster
              <ArrowRight className="w-3.5 h-3.5 text-pink-500" />
            </span>
          </div>

          {/* Right Column - Two Stacked Cards */}
          <div className="flex flex-col gap-5">
            {/* Viral Campaigns */}
            <div
              className="relative rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm p-6 md:p-7 cursor-pointer group hover:border-white/20 transition-colors duration-300 flex-1"
              onClick={() => navigate('/business')}
            >
              <img src={viralCampaignsBg} alt="" className="absolute inset-0 w-full h-full object-cover z-0 opacity-30" loading="lazy" width={768} height={512} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A]/90 via-[#0A0E1A]/70 to-[#0A0E1A]/50 z-[1]" />
              <h3 className="relative z-10 text-lg md:text-xl font-bold text-white mb-2">Viral Campaigns</h3>
              <p className="relative z-10 text-sm text-gray-400 leading-relaxed mb-5">
                Engineered strategies designed to dominate social conversations and capture digital attention.
              </p>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Growth Focused
                </span>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-gray-400 group-hover:border-white/40 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Brand Activations */}
            <div
              className="relative rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm p-6 md:p-7 cursor-pointer group hover:border-white/20 transition-colors duration-300 flex-1"
              onClick={() => navigate('/business')}
            >
              <img src={brandActivationsBg} alt="" className="absolute inset-0 w-full h-full object-cover z-0 opacity-25" loading="lazy" width={768} height={512} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A]/90 via-[#0A0E1A]/70 to-[#0A0E1A]/50 z-[1]" />
              <h3 className="relative z-10 text-lg md:text-xl font-bold text-white mb-2">Brand Activations</h3>
              <p className="relative z-10 text-sm text-gray-400 leading-relaxed mb-5">
                Immersive physical and digital experiences that turn passive consumers into brand loyalists.
              </p>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Experiential
                </span>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-gray-400 group-hover:border-white/40 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AIMusicSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 lg:py-28 relative overflow-hidden" style={{ background: '#0A0E1A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <span className="uppercase tracking-[0.25em] text-xs md:text-sm font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4 block">
            AI Music Studio
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Create Music with{' '}
            <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              AI Magic
            </span>
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-4 max-w-xl leading-relaxed">
            Transform your ideas into complete songs. Generate lyrics, compose melodies,
            and produce professional-quality music with artificial intelligence.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {musicFeatures.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 md:p-7 flex flex-col gap-4 hover:border-white/20 transition-colors duration-300 group cursor-pointer"
              onClick={() => navigate('/ai-music')}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-white">{feature.title}</h3>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>

              {/* Accent Element */}
              <div className="mt-auto pt-2">
                {feature.accent === 'waveform' && (
                  <div className="flex items-end gap-[3px] h-6">
                    {[16, 24, 12, 20, 8].map((h, i) => (
                      <div key={i} className="w-[3px] rounded-full bg-gradient-to-t from-pink-500 to-purple-500" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                )}
                {feature.accent === 'quote' && feature.quote && (
                  <p className="text-sm italic bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                    {feature.quote}
                  </p>
                )}
                {feature.accent === 'badges' && feature.badges && (
                  <div className="flex flex-wrap gap-2">
                    {feature.badges.map((badge, i) => (
                      <span key={i} className="text-[10px] uppercase tracking-[0.15em] font-semibold text-gray-300 border border-white/20 rounded-full px-3 py-1">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Studio Experience Banner */}
        <div
          className="relative rounded-2xl border border-white/10 overflow-hidden min-h-[200px] md:min-h-[340px] flex flex-col justify-end p-6 md:p-10 cursor-pointer group hover:border-white/20 transition-colors duration-300"
          onClick={() => navigate('/ai-music')}
        >
          <img src={musicStudioBg} alt="" className="absolute inset-0 w-full h-full object-cover z-0" loading="lazy" width={1280} height={576} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/70 to-transparent z-[1]" />

          <h3 className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
            The Studio Experience
          </h3>
          <p className="relative z-10 text-sm md:text-base text-gray-300 mb-6">
            Real-time collaboration with AI composers.
          </p>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-white">
              Start Making music today..!!
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReferralSection() {
  return (
    <section className="py-16 lg:py-28 relative overflow-hidden" style={{ background: '#0A0E1A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <span className="uppercase tracking-[0.25em] text-xs md:text-sm font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4 block">
            Referral Program
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Earn While You{' '}
            <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Share
            </span>
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-4 max-w-xl leading-relaxed">
            Build your network and earn commissions by referring friends to WishMe.
            The more you share, the more you earn!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left — Plan Cards */}
          <div className="flex flex-col gap-4">
            {/* Basic Plan */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 md:p-7 relative overflow-hidden group hover:border-white/20 transition-colors">
              <div className="absolute top-5 right-5 opacity-10">
                <Star className="w-10 h-10 text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500 mb-2 block">Basic Plan</span>
              <h3 className="text-2xl md:text-3xl font-black text-white italic mb-4">5% Commission</h3>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 block mb-1">Tier Access</span>
                  <span className="text-sm font-semibold text-white">L1 Referral Only</span>
                </div>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="rounded-2xl border border-orange-500/30 bg-white/[0.04] backdrop-blur-sm p-6 md:p-7 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#0A0E1A] bg-gradient-to-r from-orange-400 to-orange-500 rounded-full px-3 py-1">
                  Most Popular
                </span>
              </div>
              <div className="absolute top-5 right-24 text-orange-500">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-orange-400 mb-2 block">Premium Plan</span>
              <h3 className="text-2xl md:text-3xl font-black text-white italic mb-4">
                L1: <span className="text-orange-400">10%</span> | L2: <span className="text-orange-400">5%</span>
              </h3>
              <div className="flex items-center gap-8">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 block mb-1">Tier Access</span>
                  <span className="text-sm font-semibold text-white">Dual Level Mastery</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 block mb-1">Exclusive</span>
                  <span className="text-sm font-semibold text-white">Priority Payouts</span>
                </div>
              </div>
            </div>

            {/* Elite Plan */}
            <div className="rounded-2xl border border-purple-500/30 bg-white/[0.04] backdrop-blur-sm p-6 md:p-7 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute top-5 right-5 text-purple-400">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-purple-400 mb-2 block">Elite Plan</span>
              <h3 className="text-2xl md:text-3xl font-black text-white italic mb-4">
                L1: <span className="text-green-400">15%</span> | L2: <span className="text-green-400">10%</span>
              </h3>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 block mb-1">Tier Access</span>
                <span className="text-sm font-semibold text-white">2 Levels VIP Matrix</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 text-white px-8"
                asChild
              >
                <Link to="/auth">Start Earning Today</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 px-8"
                asChild
              >
                <Link to="/pricing">View All Plans</Link>
              </Button>
            </div>
          </div>

          {/* Right — Phone Mockup */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 rounded-full blur-3xl" />
              <img
                src={referralPhoneMockup}
                alt="Referral Stats Dashboard"
                className="relative z-10 w-[320px] md:w-[380px] drop-shadow-2xl"
                loading="lazy"
                width={512}
                height={960}
              />
              {/* Floating stat card */}
              <div className="absolute -top-4 -right-8 z-20 rounded-xl border border-white/10 bg-[#0A0E1A]/90 backdrop-blur-md p-3 shadow-xl">
                <span className="text-[9px] uppercase tracking-[0.15em] text-gray-400 block">Total Commission</span>
                <span className="text-xl font-black text-green-400">₹12,430</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}