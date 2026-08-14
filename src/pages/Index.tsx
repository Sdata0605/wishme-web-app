import { Link } from "react-router-dom";
import {
  Bus,
  CreditCard,
  Heart,
  Hotel,
  IndianRupee,
  Plane,
  Smartphone,
  Train,
  Tv,
  Wifi,
  Zap,
  Car,
} from "lucide-react";
import { MarketingHeader } from "@/components/superapp/MarketingHeader";
import logo from "@/assets/wish-me-logo.png";

const popularServices = [
  { label: "Flights", icon: Plane, to: "/travel/flights" },
  { label: "Hotels", icon: Hotel, to: "/travel/hotels" },
  { label: "Bus", icon: Bus, to: "/travel/bus" },
  { label: "Electricity", icon: Zap, to: "/bills/pay?category=electricity" },
  { label: "Water", icon: Wifi, to: "/bills/pay?category=water" },
  { label: "Gas", icon: Zap, to: "/bills/pay?category=gas" },
  { label: "Mobile", icon: Smartphone, to: "/recharge" },
  { label: "DTH", icon: Tv, to: "/recharge" },
  { label: "FASTag", icon: Car, to: "/bills" },
  { label: "Broadband", icon: Wifi, to: "/bills/pay?category=broadband" },
  { label: "Credit Card", icon: CreditCard, to: "/bills" },
  { label: "Loan EMI", icon: IndianRupee, to: "/bills" },
];

const billServices = [
  { label: "Electricity", icon: Zap, to: "/bills/pay?category=electricity" },
  { label: "Water", icon: Wifi, to: "/bills/pay?category=water" },
  { label: "Gas", icon: Zap, to: "/bills/pay?category=gas" },
  { label: "Broadband", icon: Wifi, to: "/bills/pay?category=broadband" },
  { label: "Mobile", icon: Smartphone, to: "/recharge" },
  { label: "Card", icon: CreditCard, to: "/bills" },
];

const travelServices = [
  { label: "Flights", icon: Plane, to: "/travel/flights" },
  { label: "Bus", icon: Bus, to: "/travel/bus" },
  { label: "Train", icon: Train, to: "/travel" },
  { label: "Hotels", icon: Hotel, to: "/travel/hotels" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <MarketingHeader active="Home" />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-medium text-white/55">Wishes · Payments · Travel</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Make every moment <span className="text-[#ff5c00]">special</span>.
              <span className="mt-2 block text-white/90">Manage everything in one place.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/65">
              Celebrity video wishes, greeting cards, BBPS bills, recharges, travel and wallet — built for India.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/celebrities"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#ff5c00] px-5 text-sm font-semibold text-white hover:bg-[#ea580c]"
              >
                <Heart className="h-4 w-4" /> Book a wish
              </Link>
              <Link
                to="/app"
                className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/5"
              >
                Open app
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
              <div>
                <dt className="text-white/45">Customers</dt>
                <dd className="mt-1 text-lg font-semibold">2M+</dd>
              </div>
              <div>
                <dt className="text-white/45">Payments</dt>
                <dd className="mt-1 text-lg font-semibold">Secure</dd>
              </div>
              <div>
                <dt className="text-white/45">Support</dt>
                <dd className="mt-1 text-lg font-semibold">24×7</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[2rem] border border-white/10 bg-[#121a2b] p-3 shadow-2xl">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#0b1220] px-6 py-10 text-center">
                <img src={logo} alt="" className="mx-auto h-14 w-14 rounded-xl object-contain" />
                <p className="mt-4 text-2xl font-semibold">
                  Wish<span className="text-[#ff5c00]">Me</span>
                </p>
                <p className="mt-2 text-sm text-white/55">All your needs, one trusted app.</p>
                <div className="mt-8 grid grid-cols-2 gap-2 text-left text-xs">
                  {[
                    ["Bills", "/bills"],
                    ["Travel", "/travel/flights"],
                    ["Wallet", "/wallet"],
                    ["Wishes", "/celebrities"],
                  ].map(([label, to]) => (
                    <Link
                      key={label}
                      to={to}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-medium text-white/80 hover:bg-white/10"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Link
            to="/celebrities"
            className="rounded-xl border border-white/10 bg-[#161b2e] p-5 hover:border-[#ff5c00]/40"
          >
            <p className="text-lg font-semibold">Celebrity wishes</p>
            <p className="mt-1 text-sm text-white/55">Personalised video messages from stars you love</p>
          </Link>
          <Link
            to="/ai-greetings"
            className="rounded-xl border border-white/10 bg-[#161b2e] p-5 hover:border-white/25"
          >
            <p className="text-lg font-semibold">Greeting cards</p>
            <p className="mt-1 text-sm text-white/55">Create and send cards for any occasion</p>
          </Link>
        </div>

        <section className="mt-6 rounded-xl bg-white p-5 text-slate-900 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All services</h2>
            <Link to="/all-services" className="text-sm font-medium text-[#ea580c] hover:underline">
              Explore all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {popularServices.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 px-2 py-3 text-center hover:border-slate-200 hover:bg-slate-50"
              >
                <s.icon className="h-5 w-5 text-[#ff5c00]" strokeWidth={2} />
                <span className="text-[11px] font-medium text-slate-700">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-5 text-slate-900 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Pay bills</h2>
              <Link to="/bills" className="text-sm font-medium text-[#ea580c] hover:underline">
                Open
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {billServices.map((s) => (
                <Link key={s.label} to={s.to} className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-slate-50">
                  <s.icon className="h-5 w-5 text-slate-700" />
                  <span className="text-[11px] font-medium text-slate-700">{s.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 text-slate-900 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Travel</h2>
              <Link to="/travel" className="text-sm font-medium text-[#ea580c] hover:underline">
                Open
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {travelServices.map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-slate-50"
                >
                  <s.icon className="h-5 w-5 text-slate-700" />
                  <span className="text-[11px] font-medium text-slate-700">{s.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-4 flex flex-col items-start justify-between gap-4 rounded-xl border border-orange-200/30 bg-orange-50 px-5 py-4 text-slate-900 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">₹100 cashback on first bill</p>
            <p className="text-sm text-slate-600">
              Code <span className="font-medium">WISH100</span>
            </p>
          </div>
          <Link
            to="/bills"
            className="inline-flex h-10 items-center rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
          >
            Pay now
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-semibold">
            Wish<span className="text-[#ff5c00]">Me</span>
            <span className="ml-2 font-normal text-white/45">WatchMyIndia</span>
          </p>
          <div className="flex gap-4 text-xs text-white/50">
            <Link to="/support" className="hover:text-[#ff5c00]">
              Support
            </Link>
            <Link to="/privacy-policy" className="hover:text-[#ff5c00]">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[#ff5c00]">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
