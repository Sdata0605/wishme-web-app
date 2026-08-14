import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Gift, Star, Tag } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel, SectionHeader } from "@/components/superapp/ServiceIcon";

const highlights = [
  { title: "₹100 cashback on first bill", code: "WISH100" },
  { title: "Up to 20% off flights", code: "FLY20" },
  { title: "₹75 cashback on recharge", code: "RECH75" },
  { title: "10% off bus bookings", code: "BUS10" },
];

const partners = [
  { name: "Amazon", offer: "Up to 5% off shopping" },
  { name: "Myntra", offer: "Extra 10% off fashion" },
  { name: "Swiggy", offer: "Flat ₹50 off food" },
  { name: "BookMyShow", offer: "Up to ₹100 off movies" },
  { name: "Zomato", offer: "Flat ₹40 off food" },
];

export default function RewardsOffers() {
  const [copied, setCopied] = useState<string | null>(null);

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <SuperAppShell nav="rewards">
      <PageTitle title="Rewards" subtitle="WishPoints, coupons and partner deals" />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Points balance</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                1,250 <span className="text-sm font-normal text-slate-500">WishPoints</span>
              </p>
              <p className="text-sm text-slate-500">Worth ₹125 · Silver tier</p>
              <div className="mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[42%] rounded-full bg-[#ff5c00]" />
              </div>
              <p className="mt-1 text-xs text-slate-400">12,500 points to Gold</p>
            </div>
            <Link
              to="/bills"
              className="inline-flex h-10 items-center rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
            >
              Earn on bills
            </Link>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Star, label: "Earn", sub: "On every spend" },
            { icon: Gift, label: "Redeem", sub: "Catalogue" },
            { icon: Tag, label: "Coupons", sub: "15 available" },
            { icon: Clock3, label: "History", sub: "Points activity" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-300"
            >
              <item.icon className="h-4 w-4 text-[#ff5c00]" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionHeader title="Coupons" showAction={false} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <article key={item.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold leading-snug text-slate-900">{item.title}</p>
              <button
                type="button"
                onClick={() => copyCode(item.code)}
                className="mt-3 rounded-md border border-dashed border-[#ff5c00]/50 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-[#ea580c]"
              >
                {copied === item.code ? "Copied" : item.code}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SectionHeader title="Partner offers" showAction={false} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {partners.map((p) => (
            <article key={p.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="mt-1 text-xs text-slate-500">{p.offer}</p>
              <button type="button" className="mt-2 text-xs font-semibold text-[#ea580c] hover:underline">
                View
              </button>
            </article>
          ))}
        </div>
      </div>
    </SuperAppShell>
  );
}
