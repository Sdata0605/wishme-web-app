import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Star, Zap, Crown, CheckCircle, Users, TrendingUp, Gift, Mic, Building2, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Basic",
    subtitle: "Perfect for getting started",
    price: "₹50",
    period: "/month",
    borderColor: "border-l-orange-500",
    checkColor: "text-orange-400",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    icon: Star,
    features: [
      "Access to Create Wish",
      "Business Promotions",
      "Create AI Music",
      "Basic customer support",
      "5% referral commission (Level 1 only)"
    ],
    popular: false,
    cta: "Get Started"
  },
  {
    name: "Premium",
    subtitle: "Most popular choice",
    price: "₹499",
    period: "/month",
    borderColor: "border-l-pink-500",
    checkColor: "text-pink-400",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400",
    icon: Zap,
    features: [
      "Everything in Basic",
      "10% discount on all services",
      "Priority customer support",
      "Advanced analytics",
      "10% referral commission (Level 1)",
      "5% referral commission (Level 2)",
      "Exclusive celebrity access"
    ],
    popular: true,
    cta: "Start Premium"
  },
  {
    name: "Elite",
    subtitle: "Maximum earning potential",
    price: "₹999",
    period: "/month",
    borderColor: "border-l-purple-500",
    checkColor: "text-purple-400",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    icon: Crown,
    features: [
      "Everything in Premium",
      "15% discount on all services",
      "Dedicated account manager",
      "Custom celebrity requests",
      "Advanced referral tracking",
      "Monthly strategy calls",
      "VIP celebrity events access"
    ],
    popular: false,
    cta: "Go Elite"
  }
];

const referralBenefits = [
  {
    icon: TrendingUp,
    title: "Multi-Level Commissions",
    description: "Earn from your direct referrals and their referrals too",
    iconBg: "bg-pink-500/20",
    iconColor: "text-pink-400"
  },
  {
    icon: Gift,
    title: "Service Discounts",
    description: "Save money on every wish, business campaign, and AI music creation",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400"
  },
  {
    icon: Users,
    title: "Growing Network",
    description: "Build a network of active users and increase your passive income",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400"
  },
  {
    icon: Star,
    title: "Exclusive Access",
    description: "Get priority access to new celebrities and features",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400"
  }
];

const steps = [
  {
    num: "01",
    title: "Basic Plan (₹50)",
    description: "5% commission on Level 1 referrals. No service discount. Perfect for beginners starting their journey.",
    borderColor: "border-l-orange-500",
    numColor: "text-orange-400",
    badge: "5% Commission",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20"
  },
  {
    num: "02",
    title: "Premium Plan (₹499)",
    description: "10% commission on Level 1, 5% on Level 2. 10% discount on services. Best value for active users.",
    borderColor: "border-l-pink-500",
    numColor: "text-pink-400",
    badge: "Most Popular",
    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20"
  },
  {
    num: "03",
    title: "Elite Plan (₹999)",
    description: "Highest commission rates with multi-level earnings. 15% discount on services. VIP benefits included.",
    borderColor: "border-l-purple-500",
    numColor: "text-purple-400",
    badge: "Max Payout",
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20"
  }
];

const whyJoin = [
  {
    icon: Mic,
    title: "Create Magical Moments",
    description: "Connect with your favorite celebrities and create unforgettable memories.",
    gradient: "from-pink-600/40 via-purple-600/30 to-indigo-800/60"
  },
  {
    icon: Building2,
    title: "Grow Your Business",
    description: "Leverage celebrity endorsements to boost your brand credibility.",
    gradient: "from-blue-600/40 via-cyan-600/30 to-teal-800/60"
  },
  {
    icon: Coins,
    title: "Earn Passive Income",
    description: "Build a referral network and earn commissions effortlessly.",
    gradient: "from-orange-600/40 via-amber-600/30 to-yellow-800/60"
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  
  const handleStartPremium = () => {
    navigate('/auth?tab=signup');
  };

  const handleScrollToPlans = () => {
    document.getElementById('pricing-cards')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A14] text-white">
      <Header />

      {/* Hero */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-purple-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[350px] bg-pink-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-indigo-600/10 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-[11px] sm:text-xs tracking-[0.25em] uppercase text-white/50 font-medium mb-4">
            Exclusive Membership
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            Choose Your{" "}
            <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed px-2">
            Unlock celebrity wishes, business campaigns, AI music creation, and earn through our referral program.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pricing-cards" className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border-l-4 ${plan.borderColor} bg-white/[0.03] border-t border-r border-b border-white/[0.06] p-6 sm:p-7 flex flex-col ${
                  plan.popular ? "md:-translate-y-3 shadow-[0_0_50px_-12px_rgba(236,72,153,0.2)]" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                </div>

                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-white/40 mt-1 mb-4">{plan.subtitle}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl sm:text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/40">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.checkColor}`} />
                      <span className="text-sm text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleStartPremium}
                  className={`w-full h-11 text-sm font-semibold rounded-xl ${
                    plan.popular
                      ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:opacity-90 border-0"
                      : "bg-transparent border border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Benefits */}
      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              Referral Program{" "}
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Benefits
              </span>
            </h2>
            <p className="text-sm sm:text-base text-white/40 max-w-xl mx-auto">
              Earn passive income by referring friends and family to WishMe.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {referralBenefits.map((b, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6 text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl ${b.iconBg} flex items-center justify-center mb-4`}>
                  <b.icon className={`w-6 h-6 ${b.iconColor}`} />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white mb-2">{b.title}</h4>
                <p className="text-xs sm:text-sm text-white/40 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              How Referral{" "}
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Commission Works
              </span>
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`rounded-xl border-l-4 ${s.borderColor} bg-white/[0.03] border-t border-r border-b border-white/[0.06] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4`}
              >
                <span className={`text-2xl sm:text-3xl font-bold ${s.numColor} shrink-0`}>{s.num}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1">{s.title}</h4>
                  <p className="text-xs sm:text-sm text-white/40 leading-relaxed">{s.description}</p>
                </div>
                <span className={`inline-flex self-start sm:self-center shrink-0 px-3 py-1 text-[10px] sm:text-xs font-medium rounded-full border ${s.badgeBg}`}>
                  {s.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              Why Join{" "}
              <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                WishMe?
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {whyJoin.map((w, i) => (
              <div key={i} className={`relative rounded-2xl overflow-hidden h-56 sm:h-64 bg-gradient-to-br ${w.gradient}`}>
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">
                  <w.icon className="w-8 h-8 text-white/80 mb-3" />
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-1">{w.title}</h4>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{w.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-sm sm:text-base text-white/40 mb-8 max-w-xl mx-auto leading-relaxed">
            Choose your plan and start creating wishes, building campaigns, making music, and earning through referrals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleStartPremium} className="h-12 px-8 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:opacity-90 border-0">
              Start with Premium
            </Button>
            <Button onClick={handleScrollToPlans} className="h-12 px-8 text-sm font-semibold rounded-xl bg-transparent border border-white/10 text-white hover:bg-white/5">
              Compare All Plans
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
