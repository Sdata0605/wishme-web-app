import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { AppSidebar } from "@/components/superapp/AppSidebar";
import { PageTitle, Panel, SectionHeader, ServiceIcon } from "@/components/superapp/ServiceIcon";
import { billCategories, dueSoonBills, savedBillers, spendingBreakdown } from "@/lib/superapp/mock-data";

function categoryParam(label: string) {
  const l = label.toLowerCase();
  if (l.includes("electric")) return "electricity";
  if (l.includes("water")) return "water";
  if (l.includes("gas")) return "gas";
  if (l.includes("broadband") || l.includes("landline")) return "broadband";
  if (l.includes("mobile") || l.includes("recharge")) return "mobile";
  return "electricity";
}

export default function BillPayments() {
  const [query, setQuery] = useState("");
  const [autoPay, setAutoPay] = useState(true);

  const categories = useMemo(
    () =>
      billCategories.filter((c) =>
        !query.trim() ? true : c.label.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query]
  );

  return (
    <SuperAppShell nav="bills">
      <div className="flex gap-5">
        <AppSidebar section="bills" />
        <div className="min-w-0 flex-1">
          <PageTitle
            title="Bill payments"
            subtitle="BBPS bills in one place"
            actions={
              <label className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search biller or category"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            }
          />

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-4">
              <div>
                <SectionHeader title="Due soon" actionHref="/passbook" actionLabel="History" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dueSoonBills.map((bill) => (
                    <article key={bill.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="font-semibold text-slate-900">{bill.name}</p>
                      <p className="text-sm text-slate-500">{bill.category}</p>
                      <p className="mt-3 text-xl font-semibold text-slate-900">{bill.amount}</p>
                      <p className="mt-1 text-sm text-slate-500">{bill.due}</p>
                      <Link
                        to={`/bills/pay?category=${categoryParam(bill.category)}`}
                        className="mt-3 inline-flex h-9 items-center rounded-lg bg-[#ff5c00] px-3 text-sm font-semibold text-white hover:bg-[#ea580c]"
                      >
                        Pay now
                      </Link>
                    </article>
                  ))}
                </div>
              </div>

              <Panel>
                <SectionHeader title="Categories" actionHref="/all-services" actionLabel="All services" />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {categories.map((item) => (
                    <ServiceIcon
                      key={item.id}
                      {...item}
                      href={`/bills/pay?category=${categoryParam(item.label)}`}
                      size="md"
                    />
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ea580c]" />
                  Secure BBPS payments
                </p>
              </Panel>

              <div id="saved">
                <SectionHeader title="Saved billers" actionHref="/bills/pay" actionLabel="Add" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {savedBillers.map((biller) => (
                    <Link
                      key={biller.id}
                      to="/bills/pay"
                      className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:border-slate-300"
                    >
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {biller.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{biller.name}</p>
                      <p className="text-xs text-slate-500">{biller.meta}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <Panel id="autopay">
                <p className="font-semibold text-slate-900">Auto-pay</p>
                <p className="mt-1 text-sm text-slate-500">Pay saved billers on due date</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{autoPay ? "On" : "Off"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPay}
                    onClick={() => setAutoPay((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full ${autoPay ? "bg-[#ff5c00]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoPay ? "left-5" : "left-0.5"}`}
                    />
                  </button>
                </div>
                <Link
                  to="/bills/pay"
                  className="mt-3 inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Manage
                </Link>
              </Panel>

              <Panel>
                <h2 className="text-sm font-semibold text-slate-900">This month</h2>
                <p className="mt-2 text-2xl font-semibold text-slate-900">₹6,782.50</p>
                <p className="text-xs font-medium text-emerald-600">↓ 12% vs Apr · 18 bills</p>
                <ul className="mt-3 space-y-1.5">
                  {spendingBreakdown.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${s.color}`} />
                      <span className="text-slate-600">{s.label}</span>
                      <span className="ml-auto text-slate-500">{s.pct}%</span>
                    </li>
                  ))}
                </ul>
                <Link to="/passbook" className="mt-3 inline-block text-sm font-medium text-[#ea580c] hover:underline">
                  View history
                </Link>
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </SuperAppShell>
  );
}
