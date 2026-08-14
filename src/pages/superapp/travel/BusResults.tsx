import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  busesForRoute,
  formatDateLabel,
  formatInr,
  queryToBus,
  writeBus,
} from "@/lib/superapp/buses";
import { cn } from "@/lib/utils";

export default function BusResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = useMemo(() => queryToBus(params), [params]);
  const [ac, setAc] = useState<"any" | "ac" | "non">("any");
  const [kind, setKind] = useState<"any" | "sleeper" | "seater">("any");
  const [luxury, setLuxury] = useState(false);
  const [night, setNight] = useState<"any" | "day" | "night">("any");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [operator, setOperator] = useState("");
  const [sort, setSort] = useState<"price" | "rating" | "depart">("price");

  const list = useMemo(() => {
    let buses = busesForRoute(search.from, search.to, search.date);
    if (ac === "ac") buses = buses.filter((b) => b.ac);
    if (ac === "non") buses = buses.filter((b) => !b.ac);
    if (kind === "sleeper") buses = buses.filter((b) => b.sleeper);
    if (kind === "seater") buses = buses.filter((b) => b.seater);
    if (luxury) buses = buses.filter((b) => b.luxury);
    if (night === "night") buses = buses.filter((b) => b.night);
    if (night === "day") buses = buses.filter((b) => !b.night);
    if (operator) buses = buses.filter((b) => b.company === operator);
    buses = buses.filter((b) => b.rating >= minRating && b.price <= maxPrice);
    buses = [...buses].sort((a, b) =>
      sort === "rating" ? b.rating - a.rating : sort === "depart" ? a.depart.localeCompare(b.depart) : a.price - b.price
    );
    return buses;
  }, [search, ac, kind, luxury, night, minRating, maxPrice, operator, sort]);

  const operators = [...new Set(busesForRoute(search.from, search.to, search.date).map((b) => b.company))];

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <div className="sticky top-[60px] z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="text-sm font-semibold">
          {search.from} → {search.to} · {formatDateLabel(search.date)}
          {search.women ? " · Women booking" : ""}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/travel/bus?${params.toString()}`}>Edit search</Link>
        </Button>
      </div>
      <ServicesPageHeader title="Available buses" subtitle={`${list.length} operators · sample seats`} />
      <TravelStepper steps={BUS_STEPS} current="results" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["price", "depart", "rating"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setSort(k)} className={cn("rounded-full border px-3 py-1 text-xs capitalize", sort === k ? "border-primary bg-primary/10 text-primary" : "border-border")}>
            {k === "depart" ? "Departure" : k}
          </button>
        ))}
        <button type="button" onClick={() => setAc(ac === "ac" ? "any" : "ac")} className={cn("rounded-full border px-3 py-1 text-xs", ac === "ac" ? "border-primary bg-primary/10 text-primary" : "border-border")}>AC</button>
        <button type="button" onClick={() => setAc(ac === "non" ? "any" : "non")} className={cn("rounded-full border px-3 py-1 text-xs", ac === "non" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Non-AC</button>
        <button type="button" onClick={() => setKind(kind === "sleeper" ? "any" : "sleeper")} className={cn("rounded-full border px-3 py-1 text-xs", kind === "sleeper" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Sleeper</button>
        <button type="button" onClick={() => setKind(kind === "seater" ? "any" : "seater")} className={cn("rounded-full border px-3 py-1 text-xs", kind === "seater" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Seater</button>
        <button type="button" onClick={() => setLuxury((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", luxury ? "border-primary bg-primary/10 text-primary" : "border-border")}>Luxury</button>
        <button type="button" onClick={() => setNight(night === "night" ? "any" : "night")} className={cn("rounded-full border px-3 py-1 text-xs", night === "night" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Night</button>
      </div>
      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">
          Max {formatInr(maxPrice)}
          <Slider className="mt-2" value={[maxPrice]} min={250} max={2500} step={50} onValueChange={(v) => setMaxPrice(v[0])} />
        </label>
        <label className="text-xs text-muted-foreground">
          Min rating {minRating}+
          <Slider className="mt-2" value={[minRating]} min={0} max={5} step={0.1} onValueChange={(v) => setMinRating(v[0])} />
        </label>
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={operator} onChange={(e) => setOperator(e.target.value)}>
          <option value="">All operators</option>
          {operators.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <Card key={b.id} className="rounded-2xl">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{b.company}</p>
                <p className="text-xs text-muted-foreground">
                  {b.ac ? "AC" : "Non-AC"} · {b.sleeper ? "Sleeper" : "Seater"} {b.luxury ? "· Luxury" : ""} · {b.layout} · {b.rating.toFixed(1)} ({b.reviews})
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {b.depart} → {b.arrive} <span className="text-sm font-normal text-muted-foreground">{b.duration}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {b.seatsLeft} seats · {b.photos} photos {b.liveTracking ? "· Live tracking" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground line-through">{formatInr(b.originalPrice)}</p>
                <p className="text-xl font-semibold">{formatInr(b.price)}</p>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => {
                    writeBus({
                      search,
                      bus: b,
                      seats: [],
                      passengers: [],
                      contact: { email: "", phone: "", state: "Maharashtra" },
                    });
                    navigate("/travel/bus/seats");
                  }}
                >
                  View seats
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ServicesPageLayout>
  );
}
