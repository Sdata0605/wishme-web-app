import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Eye,
  EyeOff,
  Plus,
  Send,
  Wallet,
} from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { AppSidebar } from "@/components/superapp/AppSidebar";
import { PageTitle, Panel, StatusChip } from "@/components/superapp/ServiceIcon";
import { cn } from "@/lib/utils";

const txs = [
  { id: "1", title: "Electricity Bill Payment", meta: "BSES · 18 May, 10:24 AM", amount: "- ₹1,250.00", status: "Success" as const, type: "debit" },
  { id: "2", title: "Wallet Top-up", meta: "UPI · 16 May, 8:02 PM", amount: "+ ₹2,000.00", status: "Success" as const, type: "credit" },
  { id: "3", title: "Mobile Recharge", meta: "Airtel · 15 May, 1:40 PM", amount: "- ₹299.00", status: "Success" as const, type: "debit" },
  { id: "4", title: "Cashback Reward", meta: "WishMe · 12 May, 4:18 PM", amount: "+ ₹75.00", status: "Success" as const, type: "credit" },
  { id: "5", title: "Flight Booking", meta: "DEL → BOM · 10 May", amount: "- ₹3,842.00", status: "Pending" as const, type: "debit" },
];

const banks = [
  { name: "HDFC Bank", mask: "•••• 4521", def: true },
  { name: "ICICI Bank", mask: "•••• 8890", def: false },
  { name: "SBI", mask: "•••• 2201", def: false },
];

const spend = [
  { label: "Bills", pct: 34, color: "bg-[#ff5c00]", amount: "₹2,248" },
  { label: "Travel", pct: 28, color: "bg-[#286ee8]", amount: "₹1,890" },
  { label: "Recharge", pct: 18, color: "bg-[#6d28d9]", amount: "₹1,220" },
  { label: "Shopping", pct: 12, color: "bg-[#10a56a]", amount: "₹814" },
  { label: "Others", pct: 8, color: "bg-slate-300", amount: "₹610" },
];

export default function WalletOverview() {
  const [visible, setVisible] = useState(true);
  const [tab, setTab] = useState<"All" | "Credits" | "Debits" | "Rewards" | "Refunds">("All");
  const [autoPay, setAutoPay] = useState({ power: true, mobile: false });

  const rows = txs.filter((tx) => {
    if (tab === "All") return true;
    if (tab === "Credits") return tx.type === "credit";
    if (tab === "Debits") return tx.type === "debit";
    if (tab === "Rewards" || tab === "Refunds") return tx.type === "credit";
    return true;
  });

  return (
    <SuperAppShell nav="wallet">
      <div className="flex gap-5">
        <AppSidebar section="wallet" />

        <div className="min-w-0 flex-1">
          <PageTitle title="Wallet" subtitle="Balance, transfers and linked methods" />

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <Panel className="border-slate-800 bg-[#0b1220] text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm text-white/70">
                      <Wallet className="h-4 w-4" /> Total balance
                      <button type="button" onClick={() => setVisible((v) => !v)} aria-label="Toggle balance">
                        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{visible ? "₹2,450.75" : "₹••••••"}</p>
                    <p className="mt-1 text-sm text-white/60">WishPoints: 1,250 · Worth ₹125</p>
                  </div>
                  <Link
                    to="/scan"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
                  >
                    Scan & Pay
                  </Link>
                </div>
              </Panel>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Add money", sub: "Top up wallet", icon: Plus, to: "/wallet" },
                  { label: "Withdraw", sub: "To bank account", icon: ArrowDownLeft, to: "/wallet" },
                  { label: "Send money", sub: "UPI / contacts", icon: Send, to: "/scan" },
                  { label: "Request", sub: "Ask to receive", icon: ArrowUpRight, to: "/wallet" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-violet-200"
                  >
                    <a.icon className="h-4 w-4 text-[#ff5c00]" />
                    <p className="mt-2 text-sm font-semibold text-slate-900">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.sub}</p>
                  </Link>
                ))}
              </div>

              <Panel>
                <div className="mb-3 flex flex-wrap gap-1">
                  {(["All", "Credits", "Debits", "Rewards", "Refunds"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium",
                        tab === t ? "bg-orange-50 text-[#ea580c]" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <ul className="divide-y divide-slate-100">
                  {rows.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{tx.title}</p>
                        <p className="text-xs text-slate-500">{tx.meta}</p>
                      </div>
                      <div className="text-right">
                        <StatusChip status={tx.status} />
                        <p
                          className={cn(
                            "mt-1 text-sm font-semibold",
                            tx.amount.startsWith("+") ? "text-emerald-600" : "text-slate-900"
                          )}
                        >
                          {tx.amount}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link to="/passbook" className="mt-2 inline-block text-sm font-medium text-[#ea580c] hover:underline">
                  Open full passbook
                </Link>
              </Panel>
            </div>

            <aside className="space-y-4">
              <Panel>
                <h2 className="text-sm font-semibold text-slate-900">Monthly spend</h2>
                <p className="mt-2 text-2xl font-semibold text-slate-900">₹6,782.50</p>
                <p className="text-xs font-medium text-emerald-600">↓ 12% vs last month</p>
                <ul className="mt-3 space-y-2">
                  {spend.map((s) => (
                    <li key={s.label} className="text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", s.color)} />
                        <span className="text-slate-600">{s.label}</span>
                        <span className="ml-auto font-medium text-slate-900">{s.amount}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Download statement
                </button>
              </Panel>

              <Panel>
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Linked payment methods</h2>
                <ul className="space-y-2">
                  {banks.map((b) => (
                    <li key={b.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.mask}</p>
                      </div>
                      {b.def ? (
                        <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-[#ea580c]">
                          Default
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <button type="button" className="mt-3 text-sm font-medium text-[#ea580c] hover:underline">
                  + Add method
                </button>
              </Panel>

              <Panel>
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Auto-pay & reminders</h2>
                {[
                  { key: "power" as const, label: "Electricity · BESCOM" },
                  { key: "mobile" as const, label: "Mobile · Airtel" },
                ].map((item) => (
                  <div key={item.key} className="mb-2 flex items-center justify-between gap-2 py-1">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoPay[item.key]}
                      onClick={() => setAutoPay((s) => ({ ...s, [item.key]: !s[item.key] }))}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        autoPay[item.key] ? "bg-[#ff5c00]" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                          autoPay[item.key] ? "left-5" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </SuperAppShell>
  );
}
