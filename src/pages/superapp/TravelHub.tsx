import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, ChevronLeft, Copy, Plane, Users } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fareDeals, travelModes } from "@/lib/superapp/mock-data";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export default function TravelHub() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("flights");
  const [trip, setTrip] = useState<"oneway" | "round">("oneway");
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("BOM");
  const [depart, setDepart] = useState("2025-05-24");
  const [travellers, setTravellers] = useState("1");
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function copyPnr() {
    void navigator.clipboard?.writeText("AB12CD");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ServicesPageLayout>
      <Link
        to="/all-services"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="Travel"
        subtitle="Flights, bus, trains and hotels"
        actions={
          <Button onClick={() => navigate("/travel/flights")}>
            <Plane className="h-4 w-4" /> Book flights
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {travelModes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                if (item.id === "flights") navigate("/travel/flights");
                if (item.id === "hotels") navigate("/travel/hotels");
                if (item.id === "bus") navigate("/travel/bus");
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-3 flex gap-4 border-b border-border text-sm font-medium">
              <button
                type="button"
                onClick={() => setTrip("oneway")}
                className={cn(
                  "pb-2",
                  trip === "oneway" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                )}
              >
                One way
              </button>
              <button
                type="button"
                onClick={() => setTrip("round")}
                className={cn(
                  "pb-2",
                  trip === "round" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                )}
              >
                Round trip
              </button>
            </div>

            <div className="relative mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">From</span>
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value.toUpperCase().slice(0, 3))}
                  className={cn(fieldClass, "font-semibold uppercase")}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">To</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value.toUpperCase().slice(0, 3))}
                  className={cn(fieldClass, "font-semibold uppercase")}
                />
              </label>
              <button
                type="button"
                onClick={swap}
                className="absolute left-1/2 top-[1.95rem] hidden h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground sm:inline-flex"
                aria-label="Swap cities"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> Departure
                </span>
                <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Travellers
                </span>
                <select value={travellers} onChange={(e) => setTravellers(e.target.value)} className={fieldClass}>
                  <option value="1">1 · Economy</option>
                  <option value="2">2 · Economy</option>
                  <option value="3">3 · Economy</option>
                  <option value="4">4 · Economy</option>
                </select>
              </label>
            </div>

            <Button
              type="button"
              className="w-full rounded-xl"
              onClick={() => {
                if (mode === "flights") {
                  navigate(`/travel/flights/results?from=${from}&to=${to}&depart=${depart}&adults=${travellers}&trip=${trip}`);
                  return;
                }
                setSearched(true);
              }}
            >
              Search {mode}
            </Button>
            {searched ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Sample fares for {from} → {to} · {travellers} traveller(s).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Best fares</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {fareDeals.map((deal) => (
                <Card key={deal.id} className="rounded-2xl border-border">
                  <CardContent className="p-4">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {deal.off}
                    </span>
                    <p className="mt-2 font-semibold text-foreground">{deal.route}</p>
                    <p className="text-xs text-muted-foreground">{deal.meta}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {deal.price}{" "}
                      <span className="text-xs font-normal text-muted-foreground line-through">{deal.was}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="rounded-2xl border-border">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Your bookings</h2>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {from} → {to}
                  </p>
                  <p className="text-sm text-muted-foreground">24 May 2025 · IndiGo 6E-204</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
                    PNR: AB12CD
                    <button type="button" onClick={copyPnr} className="text-muted-foreground hover:text-foreground" aria-label="Copy PNR">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {copied ? <span className="text-xs text-primary">Copied</span> : null}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Confirmed</span>
                  <p className="mt-2 font-semibold text-foreground">₹3,842</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ServicesPageLayout>
  );
}
