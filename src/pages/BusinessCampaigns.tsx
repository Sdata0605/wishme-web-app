import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Target, BarChart, Megaphone, Award, ArrowRight } from "lucide-react";

const BusinessCampaigns = () => {
  const benefits = [
    { icon: TrendingUp, title: "Boost Engagement", description: "Celebrity endorsements can increase engagement rates by up to 300%", color: "from-orange-500 to-amber-500" },
    { icon: Users, title: "Reach New Audiences", description: "Tap into celebrity fan bases to expand your market reach", color: "from-purple-500 to-violet-500" },
    { icon: Target, title: "Targeted Marketing", description: "Choose celebrities that align with your brand and target demographic", color: "from-cyan-500 to-blue-500" },
    { icon: BarChart, title: "Measurable Results", description: "Track campaign performance with detailed analytics", color: "from-pink-500 to-rose-500" },
  ];

  const campaignTypes = [
    { title: "Product Launches", description: "Have celebrities introduce your new products to their followers", price: "Starting at ₹50,000" },
    { title: "Brand Awareness", description: "Build brand recognition with celebrity testimonials and endorsements", price: "Starting at ₹75,000" },
    { title: "Social Media Campaigns", description: "Amplify your social media presence with celebrity collaborations", price: "Starting at ₹40,000" },
    { title: "Event Promotions", description: "Get celebrities to promote your events and increase attendance", price: "Starting at ₹60,000" },
  ];

  const successStories = [
    { stat: "300%", label: "ROI", description: "E-commerce brand saw 3x return on investment with celebrity product launch campaign" },
    { stat: "5M+", label: "Reach", description: "Tech startup reached over 5 million potential customers through celebrity endorsement" },
    { stat: "85%", label: "Engagement", description: "Fashion brand achieved 85% engagement rate on celebrity collaboration posts" },
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
              For Businesses
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              Celebrity{" "}
              <span className="italic bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Campaigns</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Elevate your brand with powerful celebrity-driven marketing campaigns
            </p>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 h-12 text-base font-semibold hover:opacity-90" asChild>
              <Link to="/business">Learn More <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Celebrity Campaigns Work</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Leverage the power of celebrity influence for your brand</p>
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

        {/* Campaign Options */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Campaign Options</h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Choose the perfect campaign type for your business goals</p>
            <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {campaignTypes.map((c, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                  <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{c.description}</p>
                  <p className="text-base font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">{c.price}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Success Stories</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {successStories.map((s, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                  <Award className="w-10 h-10 text-pink-400 mx-auto mb-4" />
                  <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-1">{s.stat}</p>
                  <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">{s.label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Launch Your Campaign?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">Contact us to discuss how celebrity partnerships can transform your business</p>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white border-0 rounded-full px-8 hover:opacity-90" asChild>
              <Link to="/business">Get Started</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BusinessCampaigns;
