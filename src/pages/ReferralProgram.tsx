import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Link } from "react-router-dom";
import { Gift, Users, DollarSign, TrendingUp, Award, Sparkles, ArrowRight, Share2, UserPlus, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  name: string;
  referral_commission_l1: number;
  referral_commission_l2: number;
}

const ReferralProgram = () => {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select('name, referral_commission_l1, referral_commission_l2')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (data) {
      setPlans(data);
    }
  };

  const benefits = [
    { icon: DollarSign, title: "Earn Commission", description: "Get up to 15% commission on every referral's purchases", color: "from-orange-500 to-amber-500" },
    { icon: Users, title: "Unlimited Referrals", description: "No limit on how many people you can refer", color: "from-purple-500 to-violet-500" },
    { icon: TrendingUp, title: "Multi-Level Earnings", description: "Earn on your referrals' referrals too (Level 2)", color: "from-cyan-500 to-blue-500" },
    { icon: Award, title: "Plan-Based Rewards", description: "Higher plans unlock better commission rates", color: "from-pink-500 to-rose-500" },
  ];

  const tiers = plans.length > 0 ? plans.map((plan, index) => ({
    name: plan.name.charAt(0).toUpperCase() + plan.name.slice(1),
    l1Commission: `${plan.referral_commission_l1}%`,
    l2Commission: `${plan.referral_commission_l2}%`,
    isPopular: index === 1
  })) : [
    { name: "Basic", l1Commission: "5%", l2Commission: "0%", isPopular: false },
    { name: "Premium", l1Commission: "10%", l2Commission: "5%", isPopular: true },
    { name: "Elite", l1Commission: "15%", l2Commission: "10%", isPopular: false }
  ];

  const howItWorks = [
    { step: "01", icon: Share2, title: "Get Your Link", description: "Sign up and get your unique referral link from your dashboard" },
    { step: "02", icon: UserPlus, title: "Share & Invite", description: "Share your link with friends, family, and on social media" },
    { step: "03", icon: Wallet, title: "Earn Rewards", description: "Get commissions when they sign up and make bookings" },
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
              Referral Program
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              Earn While You{" "}
              <span className="italic bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Share</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Earn money by sharing Wish Me with your friends and family. Unlock multi-level commissions with every referral.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 h-12 text-base font-semibold hover:opacity-90" asChild>
              <Link to="/referrals">Start Earning <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Program Benefits</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Everything you need to start earning through referrals</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Commission Tiers */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Commission Rates by Plan</h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Your commission rate depends on your subscription plan. Upgrade to unlock higher earnings!
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-end">
              {tiers.map((tier, i) => (
                <div key={i} className={`relative bg-white/[0.03] border rounded-2xl overflow-hidden transition-transform ${tier.isPopular ? "border-pink-500/40 md:scale-105 shadow-[0_0_40px_-10px_rgba(236,72,153,0.2)]" : "border-white/[0.06]"}`}>
                  {tier.isPopular && (
                    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-center py-1.5 text-xs font-bold tracking-widest uppercase">
                      Most Popular
                    </div>
                  )}
                  <div className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-gray-300 uppercase tracking-wider">{tier.name}</span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">L1 Commission</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-6">{tier.l1Commission}</p>
                    <div className="border-t border-dashed border-white/[0.08] pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">L1 Referral</span>
                        <span className="font-semibold">{tier.l1Commission}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">L2 Referral</span>
                        <span className="font-semibold">{tier.l2Commission}</span>
                      </div>
                    </div>
                    <Button className={`w-full mt-6 rounded-full h-10 text-sm font-semibold ${tier.isPopular ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 hover:opacity-90" : "bg-transparent border border-white/[0.12] text-white hover:bg-white/[0.05]"}`} asChild>
                      <Link to="/pricing">{tier.isPopular ? "Get Started" : "Select Plan"}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-8">
                {howItWorks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="flex gap-5">
                      <div className="shrink-0">
                        <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">{item.step}</span>
                      </div>
                      <div className="border-l border-white/[0.08] pl-5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-4 h-4 text-pink-400" />
                          <h3 className="text-lg font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 aspect-[4/3] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center mx-auto">
                      <Gift className="w-8 h-8 text-pink-400" />
                    </div>
                    <p className="text-lg font-semibold">Referral Dashboard</p>
                    <p className="text-sm text-gray-500">Track earnings, referrals & payouts</p>
                    <div className="grid grid-cols-3 gap-3 pt-4">
                      {["Earnings", "Referrals", "Payouts"].map((label) => (
                        <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="text-lg font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">—</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Program Success</h2>
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
              {[
                { value: "₹50L+", label: "Paid to Referrers" },
                { value: "10,000+", label: "Active Referrers" },
                { value: "25,000+", label: "Successful Referrals" },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">{stat.value}</p>
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of referrers earning passive income with Wish Me</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 hover:opacity-90" asChild>
                <Link to="/referrals">Go to My Referrals</Link>
              </Button>
              <Button size="lg" className="bg-transparent border border-white/[0.12] text-white rounded-full px-8 hover:bg-white/[0.05]" asChild>
                <Link to="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ReferralProgram;
