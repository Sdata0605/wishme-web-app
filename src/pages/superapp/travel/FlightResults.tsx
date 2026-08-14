import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Lock, Split } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  AIRLINES,
  TIME_SLOTS,
  type FlightOffer,
  type TimeSlot,
  addDays,
  cabinLabel,
  cityByCode,
  fareCalendar,
  flightsForRoute,
  formatDateLabel,
  formatInr,
  getTimeSlot,
  queryToSearch,
  searchToQuery,
  travellerSummary,
  writeBooking,
} from "@/lib/superapp/flights";
import { cn } from "@/lib/utils";

type SortKey = "price" | "depart" | "duration" | "arrive";

export default function FlightResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = useMemo(() => queryToSearch(params), [params]);
  const [leg, setLeg] = useState<"out" | "back">("out");
  const [outbound, setOutbound] = useState<FlightOffer | null>(null);
  const [multiIdx, setMultiIdx] = useState(0);
  const [pickedLegs, setPickedLegs] = useState<FlightOffer[]>([]);
  const [nonStop, setNonStop] = useState(false);
  const [refundable, setRefundable] = useState(false);
  const [nearby, setNearby] = useState(true);
  const [split, setSplit] = useState(true);
  const [sort, setSort] = useState<SortKey>("price");
  const [airlines, setAirlines] = useState<string[]>([]);
  const [depSlots, setDepSlots] = useState<TimeSlot[]>([]);
  const [arrSlots, setArrSlots] = useState<TimeSlot[]>([]);
  const [layover, setLayover] = useState("");
  const [maxDuration, setMaxDuration] = useState(300);
  const [priceCap, setPriceCap] = useState(12000);
  const [details, setDetails] = useState<FlightOffer | null>(null);
  const [lockFlight, setLockFlight] = useState<FlightOffer | null>(null);

  const multiLeg = search.trip === "multicity" ? search.legs?.[multiIdx] : undefined;
  const from = multiLeg?.from ?? (leg === "back" && search.trip === "round" ? search.to : search.from);
  const to = multiLeg?.to ?? (leg === "back" && search.trip === "round" ? search.from : search.to);
  const date = multiLeg?.depart ?? (leg === "back" ? search.returnDate || addDays(search.depart, 3) : search.depart);
  const calendar = useMemo(() => fareCalendar(from, to, date), [from, to, date]);

  const flights = useMemo(() => {
    let list = flightsForRoute(from, to, date);
    if (!nearby) list = list.filter((f) => !f.nearbyAirport);
    if (!split) list = list.filter((f) => !f.splitTicket);
    if (nonStop) list = list.filter((f) => f.stops === 0);
    if (refundable) list = list.filter((f) => f.refundable);
    if (airlines.length) list = list.filter((f) => airlines.includes(f.airline));
    if (depSlots.length) list = list.filter((f) => depSlots.includes(getTimeSlot(f.depart)));
    if (arrSlots.length) list = list.filter((f) => arrSlots.includes(getTimeSlot(f.arrive)));
    if (layover) list = list.filter((f) => (f.layoverCity || "").toLowerCase().includes(layover.toLowerCase()));
    list = list.filter((f) => f.durationMins <= maxDuration && f.price <= priceCap);
    list = [...list].sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "duration"
          ? a.durationMins - b.durationMins
          : sort === "arrive"
            ? a.arrive.localeCompare(b.arrive)
            : a.depart.localeCompare(b.depart)
    );
    return list;
  }, [from, to, date, nearby, split, nonStop, refundable, airlines, depSlots, arrSlots, layover, maxDuration, priceCap, sort]);

  function pick(flight: FlightOffer) {
    if (search.trip === "multicity" && search.legs?.length) {
      const nextPicked = [...pickedLegs, flight];
      if (multiIdx < search.legs.length - 1) {
        setPickedLegs(nextPicked);
        setMultiIdx((i) => i + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      writeBooking({
        search,
        flight: nextPicked[0],
        returnFlight: nextPicked[1],
        extraFlights: nextPicked.slice(2),
        fareKey: "wishspecial",
        protection: false,
      });
      navigate("/travel/flights/fares");
      return;
    }
    if (search.trip === "round" && leg === "out") {
      setOutbound(flight);
      setLeg("back");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    writeBooking({
      search,
      flight: search.trip === "round" && outbound ? outbound : flight,
      returnFlight: search.trip === "round" ? flight : undefined,
      fareKey: "wishspecial",
      protection: false,
    });
    navigate("/travel/flights/fares");
  }

  function lockAndContinue(flight: FlightOffer) {
    const until = new Date();
    until.setHours(until.getHours() + 24);
    if (search.trip === "round" && leg === "out") {
      setOutbound(flight);
      setLeg("back");
      setLockFlight(null);
      return;
    }
    writeBooking({
      search,
      flight: search.trip === "round" && outbound ? outbound : flight,
      returnFlight: search.trip === "round" ? flight : undefined,
      fareKey: "wishspecial",
      protection: false,
      priceLock: { until: until.toISOString(), fee: 99 },
    });
    navigate("/travel/flights/fares");
  }

  const fromCity = cityByCode(from);
  const toCity = cityByCode(to);
  const layoverCities = [...new Set(flightsForRoute(from, to, date).map((f) => f.layoverCity).filter(Boolean))] as string[];

  return (
    <ServicesPageLayout>
      <Link
        to="/all-services"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <div className="sticky top-[60px] z-10 mb-4 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {fromCity.city} → {toCity.city}
            {search.trip === "round" ? (
              <span className="ml-2 text-xs font-medium text-primary">{leg === "out" ? "Select outbound" : "Select return"}</span>
            ) : null}
            {search.trip === "multicity" ? (
              <span className="ml-2 text-xs font-medium text-primary">
                Multi city · leg {multiIdx + 1}/{search.legs?.length ?? 1}
              </span>
            ) : null}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/travel/flights?${params.toString()}`}>Edit search</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateLabel(date)} · {travellerSummary(search)} · {cabinLabel(search.cabin)}
        </p>
      </div>

      <ServicesPageHeader
        title={`${fromCity.city} → ${toCity.city}`}
        subtitle={`${flights.length} flights · sample live-style inventory`}
      />
      <FlightStepper current="results" />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {calendar.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => {
              const next = { ...search, depart: leg === "out" ? d.date : search.depart, returnDate: leg === "back" ? d.date : search.returnDate };
              navigate(`/travel/flights/results?${searchToQuery(next)}`);
            }}
            className={cn(
              "min-w-[88px] rounded-xl border px-3 py-2 text-left text-xs",
              d.date === date ? "border-primary bg-primary/10" : "border-border bg-card"
            )}
          >
            <span className="block text-muted-foreground">{formatDateLabel(d.date)}</span>
            <span className="font-semibold">{formatInr(d.min)}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["Cheapest", "Fastest", "Departure", "Arrival"].map((label, i) => {
          const key: SortKey[] = ["price", "duration", "depart", "arrive"];
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSort(key[i])}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                sort === key[i] ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              {label}
            </button>
          );
        })}
        <button type="button" onClick={() => setNonStop((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", nonStop ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Non-stop
        </button>
        <button type="button" onClick={() => setRefundable((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", refundable ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Refundable
        </button>
        <button type="button" onClick={() => setNearby((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", nearby ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Nearby airports
        </button>
        <button type="button" onClick={() => setSplit((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", split ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Split tickets
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Airlines</p>
          <div className="flex flex-wrap gap-1">
            {AIRLINES.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => setAirlines((prev) => (prev.includes(a.name) ? prev.filter((x) => x !== a.name) : [...prev, a.name]))}
                className={cn("rounded-full border px-2 py-0.5 text-[11px]", airlines.includes(a.name) ? "border-primary text-primary" : "border-border")}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Departure</p>
          <div className="flex flex-wrap gap-1">
            {TIME_SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDepSlots((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                className={cn("rounded-full border px-2 py-0.5 text-[11px]", depSlots.includes(s.id) ? "border-primary text-primary" : "border-border")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Arrival</p>
          <div className="flex flex-wrap gap-1">
            {TIME_SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setArrSlots((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                className={cn("rounded-full border px-2 py-0.5 text-[11px]", arrSlots.includes(s.id) ? "border-primary text-primary" : "border-border")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs text-muted-foreground">
            Max duration {Math.floor(maxDuration / 60)}h {maxDuration % 60}m
            <Slider value={[maxDuration]} min={90} max={400} step={15} onValueChange={(v) => setMaxDuration(v[0])} className="mt-2" />
          </label>
          <label className="block text-xs text-muted-foreground">
            Max price {formatInr(priceCap)}
            <Slider value={[priceCap]} min={2000} max={20000} step={250} onValueChange={(v) => setPriceCap(v[0])} className="mt-2" />
          </label>
          {layoverCities.length ? (
            <select value={layover} onChange={(e) => setLayover(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Any layover city</option>
              {layoverCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {outbound && search.trip === "round" ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Outbound locked: {outbound.airline} {outbound.code} {outbound.depart}–{outbound.arrive}
        </p>
      ) : null}

      <div className="space-y-3">
        {flights.map((f) => (
          <Card key={f.id} className="rounded-2xl border-border">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-[9rem]">
                <p className="text-xs text-muted-foreground">{f.airlineCode} · {f.aircraft}</p>
                <p className="font-semibold">{f.airline}</p>
                <p className="text-xs text-muted-foreground">{f.code} · {f.onTime}% on time</p>
                {f.nearbyAirport ? <p className="mt-1 text-[11px] font-medium text-primary">Nearby airport option</p> : null}
                {f.splitTicket ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                    <Split className="h-3 w-3" /> Split ticket
                  </p>
                ) : null}
              </div>
              <div className="flex flex-1 items-center justify-between gap-4 sm:max-w-md">
                <div>
                  <p className="text-lg font-semibold">{f.depart}</p>
                  <p className="text-xs text-muted-foreground">{f.from}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[11px] text-muted-foreground">{f.duration}</p>
                  <div className="my-1 h-px bg-border" />
                  <p className="text-[11px] text-muted-foreground">
                    {f.stops === 0 ? "Non-stop" : `${f.stops} stop`}
                    {f.layover ? ` · ${f.layover}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{f.arrive}</p>
                  <p className="text-xs text-muted-foreground">{f.to}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground line-through">{formatInr(f.originalPrice)}</p>
                  <p className="text-xl font-semibold">{formatInr(f.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{f.refundable ? "Refundable" : "Non-refundable"} · {f.seatsLeft} seats</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetails(f)}>
                    Details
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLockFlight(f)}>
                    <Lock className="h-3.5 w-3.5" /> Lock
                  </Button>
                  <Button size="sm" onClick={() => pick(f)}>
                    {search.trip === "round" && leg === "out"
                      ? "Select"
                      : search.trip === "multicity" && (search.legs?.length ?? 1) > multiIdx + 1
                        ? "Select leg"
                        : "View prices"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!details} onOpenChange={() => setDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flight details</DialogTitle>
          </DialogHeader>
          {details ? (
            <div className="space-y-2 text-sm">
              <p>
                {details.airline} {details.code} · {details.aircraft}
              </p>
              <p>
                {details.depart} {details.from} → {details.arrive} {details.to} ({details.duration})
              </p>
              <p>Cabin baggage 7 kg · Check-in 15 kg (Saver) / 25 kg (WishMe)</p>
              <p>On-time {details.onTime}% · {details.seatsLeft} seats left</p>
              {details.layover ? <p>Layover {details.layover}</p> : <p>Non-stop</p>}
              <p className="text-muted-foreground">Amenities: USB, snack for sale, standard seat pitch.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!lockFlight} onOpenChange={() => setLockFlight(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock this fare · ₹99</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hold this sample fare for 24 hours. If the demo price rises, you still book at the locked amount (capped).
          </p>
          <Button onClick={() => lockFlight && lockAndContinue(lockFlight)}>Lock & continue</Button>
        </DialogContent>
      </Dialog>
    </ServicesPageLayout>
  );
}
