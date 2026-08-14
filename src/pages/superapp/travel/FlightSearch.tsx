import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, ChevronLeft, Plane, Plus, Search, Users, X } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CABIN_OPTIONS,
  FIELD_CLASS,
  FLIGHT_CITIES,
  SPECIAL_FARES,
  type CabinClass,
  type MultiCityLeg,
  type SpecialFare,
  type TripType,
  cityByCode,
  defaultDepartDate,
  fareCalendar,
  formatDateLabel,
  formatInr,
  readRecents,
  saveRecent,
  searchToQuery,
} from "@/lib/superapp/flights";
import { cn } from "@/lib/utils";

function CityPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const city = cityByCode(value);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FLIGHT_CITIES.filter(
      (c) =>
        !s ||
        c.city.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s) ||
        c.airport.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <label className="relative block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(FIELD_CLASS, "flex items-center justify-between text-left")}
      >
        <span>
          <span className="font-semibold">{city.city}</span>
          <span className="ml-1 text-muted-foreground">({city.code})</span>
        </span>
      </button>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {city.airport}
        {city.nearby.length ? ` · nearby ${city.nearby.join(", ")}` : ""}
      </p>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card p-2 shadow-lg">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City, airport or code"
            className="mb-2 h-9"
          />
          <div className="max-h-56 overflow-y-auto">
            {matches.map((c) => (
              <button
                key={c.code}
                type="button"
                className="flex w-full flex-col rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="font-medium">
                  {c.city} ({c.code})
                </span>
                <span className="text-[11px] text-muted-foreground">{c.airport}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </label>
  );
}

export default function FlightSearch() {
  const navigate = useNavigate();
  const recents = useMemo(() => readRecents(), []);
  const [trip, setTrip] = useState<TripType>("oneway");
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("BOM");
  const [depart, setDepart] = useState(defaultDepartDate());
  const [returnDate, setReturnDate] = useState(defaultDepartDate(5));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [fare, setFare] = useState<SpecialFare>("regular");
  const [groupSize, setGroupSize] = useState(9);
  const [legs, setLegs] = useState<MultiCityLeg[]>([
    { from: "DEL", to: "BOM", depart: defaultDepartDate() },
    { from: "BOM", to: "GOI", depart: defaultDepartDate(3) },
  ]);

  const calendar = useMemo(() => fareCalendar(from, to, depart), [from, to, depart]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function go(state: Parameters<typeof searchToQuery>[0]) {
    saveRecent(state);
    navigate(`/travel/flights/results?${searchToQuery(state)}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (trip !== "multicity" && from === to) return;
    const adultsFinal = fare === "group" ? Math.max(9, groupSize) : adults;
    go({
      trip,
      from: trip === "multicity" ? legs[0].from : from,
      to: trip === "multicity" ? legs[legs.length - 1].to : to,
      depart: trip === "multicity" ? legs[0].depart : depart,
      returnDate: trip === "round" ? returnDate : "",
      adults: adultsFinal,
      children: fare === "group" ? 0 : children,
      infants: fare === "group" ? 0 : infants,
      cabin,
      fare,
      doubleSeat: fare === "doubleSeat",
      groupSize: fare === "group" ? adultsFinal : undefined,
      legs: trip === "multicity" ? legs : undefined,
    });
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
        title="Book flights"
        subtitle="Search domestic & international · live-style inventory for demo"
        actions={
          <Button variant="outline" asChild>
            <Link to="/travel/trips">My Trips</Link>
          </Button>
        }
      />
      <FlightStepper current="search" />

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-4 border-b border-border text-sm font-medium">
              {(["oneway", "round", "multicity"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrip(id)}
                  className={cn(
                    "pb-2",
                    trip === id ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                  )}
                >
                  {id === "oneway" ? "One way" : id === "round" ? "Round trip" : "Multi city"}
                </button>
              ))}
            </div>

            {trip === "multicity" ? (
              <div className="mb-4 space-y-3">
                {legs.map((leg, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <CityPicker
                      label={`From · leg ${i + 1}`}
                      value={leg.from}
                      onChange={(code) =>
                        setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, from: code } : l)))
                      }
                    />
                    <CityPicker
                      label="To"
                      value={leg.to}
                      onChange={(code) =>
                        setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, to: code } : l)))
                      }
                    />
                    <label>
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">Depart</span>
                      <input
                        type="date"
                        value={leg.depart}
                        onChange={(e) =>
                          setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, depart: e.target.value } : l)))
                        }
                        className={FIELD_CLASS}
                      />
                    </label>
                    {legs.length > 2 ? (
                      <button
                        type="button"
                        className="self-end text-muted-foreground hover:text-foreground"
                        onClick={() => setLegs((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
                {legs.length < 4 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLegs((prev) => [
                        ...prev,
                        { from: prev[prev.length - 1].to, to: "GOI", depart: defaultDepartDate(prev.length + 2) },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" /> Add city
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="relative mb-4 grid gap-3 sm:grid-cols-2">
                  <CityPicker value={from} onChange={setFrom} label="From" />
                  <CityPicker value={to} onChange={setTo} label="To" />
                  <button
                    type="button"
                    onClick={swap}
                    className="absolute left-1/2 top-8 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm sm:inline-flex"
                    aria-label="Swap cities"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Departure
                    </span>
                    <input type="date" required value={depart} onChange={(e) => setDepart(e.target.value)} className={FIELD_CLASS} />
                  </label>
                  <label>
                    <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Return
                    </span>
                    <input
                      type="date"
                      disabled={trip !== "round"}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className={cn(FIELD_CLASS, "disabled:bg-muted")}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <label>
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {fare === "group" ? "Group size" : "Adults"}
                </span>
                <select
                  value={fare === "group" ? groupSize : adults}
                  onChange={(e) => (fare === "group" ? setGroupSize(Number(e.target.value)) : setAdults(Number(e.target.value)))}
                  className={FIELD_CLASS}
                >
                  {(fare === "group" ? [9, 10, 12, 15, 20] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Children</span>
                <select value={children} disabled={fare === "group"} onChange={(e) => setChildren(Number(e.target.value))} className={FIELD_CLASS}>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Infants</span>
                <select value={infants} disabled={fare === "group"} onChange={(e) => setInfants(Number(e.target.value))} className={FIELD_CLASS}>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Cabin</span>
                <select value={cabin} onChange={(e) => setCabin(e.target.value as CabinClass)} className={FIELD_CLASS}>
                  {CABIN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mb-2 text-xs font-medium text-muted-foreground">Special fares</p>
            <div className="mb-5 flex flex-wrap gap-2">
              {SPECIAL_FARES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFare(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-left text-xs font-medium",
                    fare === item.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                  <span className="ml-1 font-normal opacity-70">{item.hint}</span>
                </button>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full rounded-xl">
              <Search className="h-4 w-4" /> Search flights
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Fare calendar</p>
              <p className="mt-1 text-sm text-muted-foreground">Lowest sample fare for {from} → {to}</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {calendar.slice(0, 8).map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setDepart(d.date)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left text-xs",
                      d.date === depart ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="block text-muted-foreground">{formatDateLabel(d.date)}</span>
                    <span className="font-semibold">{formatInr(d.min)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {recents.length ? (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recent searches</p>
                <div className="mt-2 space-y-2">
                  {recents.slice(0, 4).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => go(r)}
                    >
                      <span>
                        {r.from} → {r.to}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateLabel(r.depart)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-4">
                <Plane className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium">Nearby airports included</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Search also surfaces nearby airports and split tickets, like a typical OTA listing.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </ServicesPageLayout>
  );
}
