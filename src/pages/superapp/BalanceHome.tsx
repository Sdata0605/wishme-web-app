import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Gift,
  Hotel,
  MoreHorizontal,
  Plane,
  QrCode,
  ShieldCheck,
  Smartphone,
  Train,
  Tv,
  Wallet,
  Zap,
  CreditCard,
} from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel, SectionHeader, StatusChip } from "@/components/superapp/ServiceIcon";
import logo from "@/assets/wish-me-logo.png";

const circleServices = [
  { label: "Recharge", icon: Smartphone, color: "text-[#ff5c00] bg-orange-50", to: "/bills" },
  { label: "Electricity", icon: Zap, color: "text-[#6d28d9] bg-violet-50", to: "/bills" },
  { label: "DTH", icon: Tv, color: "text-slate-700 bg-slate-50", to: "/bills" },
  { label: "Credit Card", icon: CreditCard, color: "text-[#ff5c00] bg-orange-50", to: "/bills" },
  { label: "Flights", icon: Plane, color: "text-[#6d28d9] bg-violet-50", to: "/travel/flights" },
  { label: "Bus", icon: Bus, color: "text-[#6d28d9] bg-violet-50", to: "/travel/bus" },
  { label: "Wallet", icon: Wallet, color: "text-[#ff5c00] bg-orange-50", to: "/wallet" },
  { label: "Rewards", icon: Gift, color: "text-[#6d28d9] bg-violet-50", to: "/rewards" },
  { label: "More", icon: MoreHorizontal, color: "text-slate-700 bg-slate-50", to: "/all-services" },
];

export default function BalanceHome() {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  function copyUpi() {
    void navigator.clipboard?.writeText("wishme@upi");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <SuperAppShell nav="home">
      <PageTitle title="Wallet overview" subtitle="Balance, UPI and recent activity" />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="bg-[#0b1220] text-white border-slate-800 sm:flex sm:items-center sm:gap-6">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-sm text-white/60">
              Total balance
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="text-white/70 hover:text-white"
                aria-label={visible ? "Hide balance" : "Show balance"}
              >
                {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {visible ? "₹24,560.00" : "₹••••••"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/60">
              UPI: wishme@upi
              <button type="button" onClick={copyUpi} className="hover:text-white" aria-label="Copy UPI ID">
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied ? <span className="text-xs text-emerald-300">Copied</span> : null}
            </p>
            <Link
              to="/wallet"
              className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#ff5c00] px-3 text-sm font-semibold text-[#ff5c00] hover:bg-[#ff5c00]/10"
            >
              + Add money
            </Link>
          </div>
          <Link
            to="/scan"
            className="mt-5 flex w-full flex-col items-center rounded-xl bg-white p-4 text-slate-900 sm:mt-0 sm:w-36"
          >
            <div className="relative flex h-24 w-24 items-center justify-center rounded-lg border border-slate-200">
              <QrCode className="h-16 w-16" strokeWidth={1.4} />
              <img src={logo} alt="" className="absolute h-5 w-5 rounded object-contain" />
            </div>
            <span className="mt-2 text-xs font-semibold">Scan & Pay</span>
          </Link>
        </Panel>

        <Link
          to="/bills"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
        >
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">BBPS</span>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Bharat Bill Payment System</p>
            <p className="text-sm text-slate-500">Trusted. Secure. Every bill.</p>
          </div>
          <span className="text-slate-400">›</span>
        </Link>
      </div>

      <Panel className="mt-4">
        <SectionHeader title="Services" actionHref="/all-services" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
          {circleServices.map((item) => (
            <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium text-slate-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Clock3 className="h-4 w-4" /> Bill reminder
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <p className="font-semibold text-slate-900">Electricity bill · BESCOM</p>
            <p className="text-sm text-slate-500">Due on 20 May 2025</p>
            <p className="mt-1 text-lg font-semibold text-[#ea580c]">₹2,450.00</p>
            <Link to="/bills" className="mt-2 inline-flex h-8 items-center rounded-lg bg-[#ff5c00] px-3 text-xs font-semibold text-white">
              Pay now
            </Link>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Recent transactions" actionHref="/passbook" />
          <ul className="space-y-2">
            {[
              { t: "Electricity Bill", a: "₹1,250" },
              { t: "Mobile Recharge", a: "₹299" },
              { t: "DTH Recharge", a: "₹450" },
            ].map((row) => (
              <li key={row.t} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{row.t}</p>
                  <StatusChip status="Success" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{row.a}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionHeader title="Travel shortcuts" actionHref="/travel" />
        <div className="flex flex-wrap gap-4">
          {[
            { label: "Flights", icon: Plane },
            { label: "Hotels", icon: Hotel },
            { label: "Trains", icon: Train },
            { label: "Bus", icon: Bus },
            { label: "Insurance", icon: ShieldCheck },
          ].map((item) => (
            <Link key={item.label} to="/travel" className="flex min-w-[4.5rem] flex-col items-center gap-1">
              <item.icon className="h-5 w-5 text-[#6d28d9]" />
              <span className="text-[11px] font-medium text-slate-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </SuperAppShell>
  );
}
