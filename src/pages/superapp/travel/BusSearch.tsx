import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftRight, ChevronLeft, Search } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BUS_CITIES, busSearchQuery, defaultDate } from "@/lib/superapp/buses";
import { FIELD_CLASS } from "@/lib/superapp/hotels";

export default function BusSearch() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("Mumbai");
  const [to, setTo] = useState("Pune");
  const [date, setDate] = useState(defaultDate(1));
  const [women, setWomen] = useState(false);
  const [open, setOpen] = useState<"from" | "to" | null>(null);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = q.toLowerCase();
    return BUS_CITIES.filter((c) => !s || c.toLowerCase().includes(s));
  }, [q]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (from === to) return;
    navigate(`/travel/bus/results?${busSearchQuery({ from, to, date, women })}`);
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="Book buses"
        subtitle="redBus-style search → seats → boarding points → passenger → pay"
        actions={
          <Button variant="outline" asChild>
            <Link to="/travel/trips">My Tickets</Link>
          </Button>
        }
      />
      <TravelStepper steps={BUS_STEPS} current="search" />
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="relative grid gap-3 sm:grid-cols-2">
              {(["from", "to"] as const).map((key) => (
                <label key={key} className="relative block">
                  <span className="mb-1 block text-xs text-muted-foreground">{key === "from" ? "From" : "To"}</span>
                  <button type="button" className={`${FIELD_CLASS} text-left font-semibold`} onClick={() => { setOpen(key); setQ(""); }}>
                    {key === "from" ? from : to}
                  </button>
                  {open === key ? (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card p-2 shadow-lg">
                      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="City" className="mb-2 h-9" />
                      <div className="max-h-48 overflow-y-auto">
                        {matches.filter((c) => c !== (key === "from" ? to : from)).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              if (key === "from") setFrom(c);
                              else setTo(c);
                              setOpen(null);
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </label>
              ))}
              <button
                type="button"
                className="absolute left-1/2 top-8 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card sm:inline-flex"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Date of journey</span>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLASS} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={women} onChange={(e) => setWomen(e.target.checked)} />
              Booking for a woman — women-only deals & safer seat hints
            </label>
            <Button type="submit" size="lg" className="w-full rounded-xl">
              <Search className="h-4 w-4" /> Search buses
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-semibold">Popular routes</p>
            {[
              ["Mumbai", "Pune"],
              ["Delhi", "Jaipur"],
              ["Bengaluru", "Chennai"],
              ["Hyderabad", "Goa"],
            ].map(([a, b]) => (
              <button
                key={a + b}
                type="button"
                className="block w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setFrom(a);
                  setTo(b);
                }}
              >
                {a} → {b}
              </button>
            ))}
          </CardContent>
        </Card>
      </form>
    </ServicesPageLayout>
  );
}
