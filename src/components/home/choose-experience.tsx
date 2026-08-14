import { useNavigate } from "react-router-dom";
import { Clapperboard, Music, Phone, Gift, Building2, Sparkles, ArrowRight, Star, Zap, Heart, TrendingUp } from "lucide-react";

const mainCards = [
  {
    label: "THE FLAGSHIP",
    title: "Video Wishes",
    description: "Get personalized video messages from your favorite celebrities for birthdays, anniversaries, and special moments.",
    icon: Clapperboard,
    route: "/celebrities",
    cta: "Explore Artists",
    gradient: "from-[#FF6B33] via-[#EC4899] to-[#FF3D9A]",
    bgGlow: "bg-[#FF6B33]/10",
    accentEmoji: "🎬",
    stats: "500+ Artists",
    statsIcon: Star,
    bgImage: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80",
  },
  {
    label: "NEW TECHNOLOGY",
    title: "AI Music Tracks",
    description: "Create custom AI-generated music tracks with vocals, instrumentals, and professional production quality.",
    icon: Music,
    route: "/ai-music",
    cta: "Create Music",
    gradient: "from-[#B44CFF] via-[#7C3AED] to-[#6366F1]",
    bgGlow: "bg-[#B44CFF]/10",
    accentEmoji: "🎵",
    stats: "AI Powered",
    statsIcon: Zap,
    bgImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
  },
];

const bottomCards = [
  {
    title: "Live Calls",
    description: "Schedule a personal voice call with your favorite celebrity for an unforgettable experience.",
    icon: Phone,
    route: "/celebrity-voice-call",
    gradient: "from-emerald-400 to-green-500",
    accentEmoji: "📞",
    cta: "Book a Call",
    highlight: "1-on-1",
    bgImage: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&q=80",
  },
  {
    title: "Premium Gifts",
    description: "Send curated occasion-based gifts and wishes to your loved ones on their special day.",
    icon: Gift,
    route: "/occasions",
    gradient: "from-pink-400 to-rose-500",
    accentEmoji: "🎁",
    cta: "Send a Gift",
    highlight: "Curated",
    bgImage: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&q=80",
  },
  {
    title: "For Brands",
    description: "Leverage celebrity influence for your brand campaigns, UGC content, and promotional ads.",
    icon: Building2,
    route: "/business",
    gradient: "from-sky-400 to-blue-500",
    accentEmoji: "🚀",
    cta: "Start Campaign",
    highlight: "B2B",
    bgImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
  },
];

export function ChooseExperience() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-28 bg-[#0A0E1A] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#FF6B33]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-[#B44CFF]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#EC4899]/3 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Heading */}
        <div className="text-center mb-14 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
            <span className="text-[11px] font-medium tracking-widest text-white/60 uppercase">Our Services</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Choose Your{" "}
            <span className="italic bg-gradient-to-r from-[#FF6B33] via-[#EC4899] to-[#B44CFF] bg-clip-text text-transparent">
              Experience
            </span>
          </h2>
          <p className="mt-4 md:mt-5 text-white/40 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Discover the perfect way to connect, celebrate, and create memorable moments
          </p>
        </div>

        {/* Top Row — Two Large Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {mainCards.map((card) => (
            <div
              key={card.title}
              className="group relative rounded-3xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm overflow-hidden transition-all duration-500 cursor-pointer hover:border-white/20 hover:shadow-2xl hover:shadow-black/20"
              onClick={() => navigate(card.route)}
            >
              {/* Background image */}
              <img
                src={card.bgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity duration-700 scale-110 group-hover:scale-105"
                loading="lazy"
              />
              {/* Frosted glass overlay */}
              <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-[#0A0E1A]/95 via-[#0A0E1A]/80 to-[#0A0E1A]/50 group-hover:backdrop-blur-[1px] transition-all duration-700" />

              {/* Top glow accent */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity z-10`} />
              
              {/* Hover glow */}
              <div className={`absolute -top-20 -right-20 w-40 h-40 ${card.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10`} />

              <div className="relative z-10 p-6 md:p-8 flex flex-col gap-5 min-h-[280px] md:min-h-[300px]">
                {/* Top bar: label + stats */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold tracking-[0.2em] text-white/35 uppercase">
                    <span className="text-base">{card.accentEmoji}</span>
                    {card.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <card.statsIcon className="w-3 h-3 text-white/50" />
                    <span className="text-[10px] font-medium text-white/50">{card.stats}</span>
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                  <card.icon className="w-7 h-7 text-white" strokeWidth={1.8} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2.5 tracking-tight">{card.title}</h3>
                  <p className="text-white/40 text-sm md:text-[15px] leading-relaxed max-w-sm">{card.description}</p>
                </div>

                {/* CTA */}
                <button
                  className={`inline-flex items-center gap-2 w-fit px-5 py-2.5 rounded-xl bg-gradient-to-r ${card.gradient} text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group/btn hover:scale-[1.02] active:scale-[0.98]`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(card.route);
                  }}
                >
                  {card.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Row — Three Service Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {bottomCards.map((card) => (
            <div
              key={card.title}
              className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm overflow-hidden transition-all duration-500 cursor-pointer hover:border-white/20"
              onClick={() => navigate(card.route)}
            >
              {/* Background image */}
              <img
                src={card.bgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity duration-700 scale-110 group-hover:scale-105"
                loading="lazy"
              />
              {/* Frosted glass overlay */}
              <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-[#0A0E1A]/95 via-[#0A0E1A]/80 to-[#0A0E1A]/60 group-hover:backdrop-blur-[1px] transition-all duration-700" />

              {/* Left accent line */}
              <div className={`absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b ${card.gradient} opacity-40 group-hover:opacity-100 transition-opacity z-10`} />

              <div className="relative z-10 p-5 md:p-6 flex flex-col gap-4 min-h-[220px]">
                {/* Top: emoji + badge */}
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-md`}>
                    <card.icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    {card.highlight}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1.5 tracking-tight flex items-center gap-2">
                    {card.title}
                    <span className="text-base">{card.accentEmoji}</span>
                  </h3>
                  <p className="text-white/40 text-[13px] leading-relaxed">{card.description}</p>
                </div>

                {/* CTA */}
                <button
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors group/btn w-fit"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(card.route);
                  }}
                >
                  {card.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
