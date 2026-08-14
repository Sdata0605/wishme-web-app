import { Button } from "@/components/ui/button";
import { Search, MessageSquare, CreditCard, Gift } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Search,
    title: "Find Your Star",
    description: "Browse our curated gallery of cinema, music, and sports icons. Use filters to find the perfect match for your occasion.",
    step: "01",
    iconBg: "bg-pink-500",
    iconColor: "text-white",
  },
  {
    icon: MessageSquare,
    title: "Script the Wish",
    description: "Tell us what you want them to say. Birthdays, roasts, or secret messages—we handle the creative flow.",
    step: "02",
    iconBg: "bg-pink-500",
    iconColor: "text-white",
  },
  {
    icon: CreditCard,
    title: "The Booking",
    description: "Secure your spot with our premium checkout. Your request is sent directly to the artist's private dashboard.",
    step: "03",
    iconBg: "bg-orange-400",
    iconColor: "text-white",
  },
  {
    icon: Gift,
    title: "The Big Reveal",
    description: "Receive your high-definition video within 7 days. Share the magic and make it a memory that never fades.",
    step: "04",
    iconBg: "bg-green-400",
    iconColor: "text-white",
  },
];

// Curved arrow SVG pointing right (for desktop, between cards)
const ArrowRight = () => (
  <svg width="56" height="24" viewBox="0 0 56 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden lg:block absolute -right-8 top-1/2 -translate-y-1/2 z-10 opacity-50">
    <path d="M2 12 C14 4, 28 4, 42 12" stroke="url(#arrowGrad)" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M38 8 L44 12 L38 16" stroke="url(#arrowGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <defs>
      <linearGradient id="arrowGrad" x1="0" y1="12" x2="56" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-28 relative overflow-hidden" style={{ background: '#0A0E1A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="uppercase tracking-[0.25em] text-xs md:text-sm font-semibold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4 block">
            The Journey
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Your Wish,<br />
            Delivered in{' '}
            <span className="italic bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Four Beats
            </span>
          </h2>
        </div>

        {/* Staggered Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-start">
          {steps.map((step, index) => {
            // Stagger: alternate cards vertically on desktop
            const isEven = index % 2 === 0;
            return (
              <div
                key={step.step}
                className={`relative ${isEven ? 'lg:mt-0' : 'lg:mt-16'}`}
              >
                {/* Large step number watermark */}
                <span
                  className="absolute -top-6 -left-1 text-[5rem] md:text-[6rem] font-black select-none pointer-events-none leading-none"
                  style={{ color: 'rgba(255,255,255,0.04)' }}
                >
                  {step.step}
                </span>

                {/* Card */}
                <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 pt-8 min-h-[220px] flex flex-col gap-4 hover:border-white/20 transition-colors duration-300">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-full ${step.iconBg} flex items-center justify-center shadow-lg`}>
                    <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow to next card (not after last) */}
                {index < steps.length - 1 && <ArrowRight />}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-14 md:mt-20">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-md mx-auto">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 text-white px-8 w-full sm:w-auto"
              asChild
            >
              <Link to="/celebrities">Get Started</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 px-8 w-full sm:w-auto"
              asChild
            >
              <Link to="/how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
