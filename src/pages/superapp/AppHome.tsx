import { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Heart, QrCode, Search } from "lucide-react";
import { SuperAppShell } from "@/components/superapp/SuperAppShell";
import { PageTitle, Panel, SectionHeader, ServiceIcon } from "@/components/superapp/ServiceIcon";
import { homeServiceGrid, quickActions } from "@/lib/superapp/mock-data";

export default function AppHome() {
  const [query, setQuery] = useState("");

  const filtered = homeServiceGrid.filter((s) =>
    !query.trim() ? true : s.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SuperAppShell nav="home">
      <PageTitle
        title="Home"
        subtitle="Wishes, bills, travel and wallet"
        actions={
          <Link
            to="/celebrities"
            className="inline-flex h-10 items-center rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
          >
            Book a wish
          </Link>
        }
      />

      <label className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services, bills, celebrities…"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <Link
          to="/scan"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700"
          aria-label="Scan QR"
        >
          <QrCode className="h-4 w-4" />
        </Link>
      </label>

      <div className="grid items-start gap-4 lg:grid-cols-[1.55fr_0.45fr]">
        <Panel className="p-4">
          <SectionHeader title="All Services" actionHref="/all-services" actionLabel="Explore all" />
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
            {(query.trim() ? filtered : homeServiceGrid).map((item) => (
              <ServiceIcon key={item.id} {...item} size="sm" />
            ))}
          </div>
          {query.trim() && filtered.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No services match “{query}”.</p>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="Quick pay" actionHref="/bills" actionLabel="Pay bills" />
            <div className="grid grid-cols-3 gap-2">
              {quickActions.slice(0, 6).map((item) => (
                <ServiceIcon key={item.id} {...item} size="sm" />
              ))}
            </div>
          </Panel>

          <Link
            to="/celebrities"
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <Heart className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5c00]" />
            <div>
              <p className="font-semibold text-slate-900">Celebrity wishes</p>
              <p className="mt-0.5 text-sm text-slate-500">Personalised video messages</p>
            </div>
          </Link>

          <Link
            to="/ai-greetings"
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#6d28d9]" />
            <div>
              <p className="font-semibold text-slate-900">Greeting cards</p>
              <p className="mt-0.5 text-sm text-slate-500">Make and send in a few steps</p>
            </div>
          </Link>
        </div>
      </div>

      <Panel className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 text-[#ff5c00]" />
          <div>
            <p className="font-semibold text-slate-900">₹75 cashback on first bill</p>
            <p className="text-sm text-slate-500">
              Code <span className="font-medium text-slate-800">WISH75</span> · till 31 May 2025
            </p>
          </div>
        </div>
        <Link
          to="/bills"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ff5c00] px-4 text-sm font-semibold text-white hover:bg-[#ea580c]"
        >
          Pay now
        </Link>
      </Panel>
    </SuperAppShell>
  );
}
