import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel, SectionHeader, StatusChip } from "@/components/superapp/ServiceIcon";
import { categorySummary, recentTransactions } from "@/lib/superapp/mock-data";
import { cn } from "@/lib/utils";

const tabs = ["All", "Bills", "Recharge", "Travel", "Cashback", "Rewards"] as const;
const filters = ["All", "Success", "Refund", "Pending"] as const;

export default function Passbook() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const rows = useMemo(() => {
    return recentTransactions.filter((tx) => {
      const statusOk = filter === "All" || tx.status === filter;
      if (!statusOk) return false;
      if (tab === "All") return true;
      if (tab === "Bills") return tx.kind === "bill";
      if (tab === "Recharge") return tx.kind === "recharge";
      if (tab === "Travel") return tx.kind === "travel";
      if (tab === "Cashback" || tab === "Rewards") return tx.status === "Refund" || tx.amount.startsWith("+");
      return true;
    });
  }, [tab, filter]);

  return (
    <SuperAppShell nav="passbook">
      <PageTitle
        title="Passbook"
        subtitle="Payments, cashback and rewards"
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              defaultValue="2025-05"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6d28d9]"
            />
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#ff5c00] px-3 text-sm font-semibold text-white hover:bg-[#ea580c]"
            >
              <Download className="h-4 w-4" />
              Statement
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              tab === item ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              filter === item ? "border-[#ff5c00] text-[#ea580c]" : "border-slate-200 bg-white text-slate-600"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {categorySummary.map((item) => {
          const Icon = item.icon;
          return (
            <Panel key={item.label} className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", item.color)} />
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.amount}</p>
              <p className="text-xs text-slate-500">{item.pct}</p>
            </Panel>
          );
        })}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Link to="/wallet" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <p className="text-xs font-medium text-slate-500">Cashback earned</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">₹1,250.00</p>
        </Link>
        <Link to="/rewards" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <p className="text-xs font-medium text-slate-500">Reward points</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">2,638</p>
          <p className="text-xs text-slate-500">Worth ₹263.80</p>
        </Link>
      </div>

      <Panel>
        <SectionHeader title="Recent transactions" actionHref="/passbook" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-medium">Transaction</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-slate-900">{tx.title}</p>
                    <p className="text-xs text-slate-500">{tx.vendor}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <StatusChip status={tx.status} />
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{tx.when}</td>
                  <td
                    className={cn(
                      "py-3 text-right font-semibold",
                      tx.amount.startsWith("+") ? "text-emerald-600" : "text-slate-900"
                    )}
                  >
                    {tx.amount}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No transactions for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </SuperAppShell>
  );
}
