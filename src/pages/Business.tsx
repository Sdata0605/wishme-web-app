import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Video, Users, MessageSquare, Rocket, ChevronLeft, ChevronRight, BarChart3, Check } from "lucide-react";
import { useState } from "react";
import businessHeroModel from "@/assets/business-hero-model.jpg";
import businessCaseTech from "@/assets/business-case-tech.jpg";
import businessCaseFitness from "@/assets/business-case-fitness.jpg";

const strategicEngagements = [
  {
    icon: Video,
    color: "from-orange-500 to-red-500",
    title: "Celebrity Endorsements",
    description: "Secure long-term brand ambassadors and exclusivity deals to amplify your values and reach millions of loyal followers.",
  },
  {
    icon: MessageSquare,
    color: "from-yellow-400 to-orange-500",
    title: "Brand Activations",
    description: "High-impact physical and digital experiences that create immersive brand experiences with star-studded lineups.",
  },
  {
    icon: Users,
    color: "from-green-400 to-emerald-500",
    title: "Social Campaigns",
    description: "Viral content strategies designed for platform-native engagement across TikTok, Instagram, and YouTube.",
  },
  {
    icon: Rocket,
    color: "from-purple-400 to-pink-500",
    title: "Product Launches",
    description: "Turn your product debut into a global event with strategic celebrity-led reveals and press buzz.",
  },
];

const processSteps = [
  {
    num: 1,
    title: "Submit Brief",
    description: "Share your objectives, target audience, and budget through our secure portal.",
  },
  {
    num: 2,
    title: "Choose Celebrity",
    description: "Review a curated collection of celebrities matched to your brand's identity.",
  },
  {
    num: 3,
    title: "Approve Content",
    description: "Review and refine the creative content and distribution schedule.",
  },
  {
    num: 4,
    title: "Launch Campaign",
    description: "Your campaign goes live across all channels with real-time performance tracking.",
  },
];

const investmentTiers = [
  {
    name: "Starter",
    price: "$25k",
    period: "/mo",
    popular: false,
    features: [
      "1 Digital Campaign",
      "2 Tier-3 Influencers",
      "Basic Performance Stats",
      "Executive Licensing",
    ],
  },
  {
    name: "Growth",
    price: "$85k",
    period: "/Yr",
    popular: true,
    features: [
      "5 Cross-channel Campaigns",
      "1 A-List Celebrity Match",
      "Professional Video Content",
      "PR Distribution",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    popular: false,
    features: [
      "Unlimited Activations",
      "Global IP Licensing",
      "24/7 Concierge Support",
      "Exclusive Content Rights",
    ],
  },
];

const caseStudies = [
  {
    company: "TechStart Solutions",
    image: businessCaseTech,
    stat: "300%",
    statLabel: "RETURN ON AD SPEND",
    quote: "WishMe's exclusive launch featured a tech-savvy celebrity for our product launch. The collaboration created visibility we've not seen in the B2B sector.",
    person: "Marcus Chen",
  },
  {
    company: "Fitness Pro",
    image: businessCaseFitness,
    stat: "1.2M",
    statLabel: "NEW SUBSCRIPTIONS",
    quote: "Our FitnessRevolution program transformed with API. Our brand awareness skyrocketed. Consultants use it under different verticals.",
    person: "Elena Rodriguez",
  },
];

export default function Business() {
  const { user } = useAuth();
  const [caseIndex, setCaseIndex] = useState(0);

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="bg-[#0A0E1A] min-h-screen text-white">
        {/* ─── Hero Section ─── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-28 text-center relative z-10">
            <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs tracking-widest uppercase font-medium px-4 py-1.5 rounded-full">
              Elite B2B Partnerships
            </Badge>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Amplify Your Brand with{" "}
              <br className="hidden sm:block" />
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Celebrity Power
              </span>
            </h1>

            <p className="text-white/50 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
              Access the world's most influential icons to transform your marketing
              narrative. From viral activations to exclusive endorsements, we curate
              the elite.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 text-white border-0 rounded-full px-8 py-3 text-sm font-semibold h-auto">
                Request a Proposal
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 rounded-full px-8 py-3 text-sm font-semibold h-auto bg-transparent"
              >
                View Portfolio
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Strategic Engagements ─── */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-4xl font-bold mb-12 text-center sm:text-left">
              Strategic Engagements
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {strategicEngagements.map((item, i) => (
                <div
                  key={i}
                  className="group rounded-2xl p-5 md:p-6 border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                  >
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── From Brief to Viral Launch ─── */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left – Text */}
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold mb-3">
                  From Brief to{" "}
                  <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                    Viral Launch
                  </span>
                </h2>
                <p className="text-white/40 text-sm mb-10 max-w-md">
                  Our streamlined curator process ensures that your brand vision is
                  flawlessly executed by top-tier talent.
                </p>

                <div className="space-y-8">
                  {processSteps.map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                        {step.num}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                        <p className="text-white/40 text-xs leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right – Image + analytics card */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative w-full max-w-sm lg:max-w-md">
                  <img
                    src={businessHeroModel}
                    alt="Celebrity model"
                    className="rounded-2xl w-full object-cover aspect-[3/4]"
                    width={640}
                    height={800}
                  />
                  {/* Floating analytics pill */}
                  <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-6 bg-[#151B2B]/90 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                        Live Analytics
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold">
                      2.4M+
                    </div>
                    <div className="text-white/40 text-xs">
                      Campaign Impressions Delivered
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Investment Tiers ─── */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-4xl font-bold mb-3">
                Investment Tiers
              </h2>
              <p className="text-white/40 text-sm max-w-xl mx-auto">
                Scale your celebrity influence with tailored packages designed for
                high-growth enterprises.
              </p>
              <div className="mx-auto mt-6 h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {investmentTiers.map((tier, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-6 md:p-8 border transition-all duration-300 ${
                    tier.popular
                      ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-transparent shadow-[0_0_40px_-12px_rgba(236,72,153,0.3)]"
                      : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] tracking-wider uppercase border-0 rounded-full px-4 py-1">
                      Most Popular
                    </Badge>
                  )}

                  <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl sm:text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-white/40 text-sm">{tier.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feat, fi) => (
                      <li key={fi} className="flex items-center gap-2.5 text-sm text-white/70">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${tier.popular ? "bg-pink-500/20 text-pink-400" : "bg-white/10 text-white/50"}`}>
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full rounded-full h-11 text-sm font-semibold ${
                      tier.popular
                        ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white border-0 hover:opacity-90"
                        : "bg-transparent border border-white/20 text-white hover:bg-white/5"
                    }`}
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Proven Results ─── */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold">Proven Results</h2>
                <p className="text-white/40 text-sm mt-2 max-w-md">
                  See how leading market leaders achieved unprecedented growth through
                  strategic celebrity partnerships.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setCaseIndex((p) => Math.max(0, p - 1))}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCaseIndex((p) => Math.min(caseStudies.length - 1, p + 1))
                  }
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {caseStudies.map((cs, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.03]"
                >
                  <div className="relative h-48 sm:h-56">
                    <img
                      src={cs.image}
                      alt={cs.company}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={640}
                      height={512}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h4 className="font-semibold text-sm">{cs.company}</h4>
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="mb-4">
                      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        {cs.stat}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-white/40 ml-2 font-medium">
                        {cs.statLabel}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed mb-4 line-clamp-3">
                      "{cs.quote}"
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10" />
                      <span className="text-xs text-white/60 font-medium">{cs.person}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section className="py-16 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-indigo-900/40 border border-white/[0.06] p-8 sm:p-12 md:p-20 text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0E1A]/60 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                  Ready to Transform
                  <br />
                  <span className="italic">Your Marketing?</span>
                </h2>
                <p className="text-white/40 text-sm sm:text-base max-w-xl mx-auto mb-8">
                  Join the elite network of brands leveraging celebrity influence to
                  redefine their industry presence.
                </p>
                <Button className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 text-white border-0 rounded-full px-10 py-3 text-sm font-semibold h-auto">
                  Schedule Consultation
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
