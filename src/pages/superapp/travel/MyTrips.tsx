import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  type StoredBooking,
  addDays,
  cityByCode,
  formatDateLabel,
  formatInr,
  readTrips,
  writeTrips,
} from "@/lib/superapp/flights";
import { type HotelBooking, readHotelTrips, writeHotelTrips } from "@/lib/superapp/hotels";
import { type BusBooking, readBusTrips, writeBusTrips } from "@/lib/superapp/buses";

export default function MyTrips() {
  const { toast } = useToast();
  const [kind, setKind] = useState<"flights" | "hotels" | "buses">("flights");
  const [trips, setTrips] = useState<StoredBooking[]>(() => readTrips());
  const [hotels, setHotels] = useState<HotelBooking[]>(() => readHotelTrips());
  const [buses, setBuses] = useState<BusBooking[]>(() => readBusTrips());
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  const list = useMemo(
    () =>
      trips.filter((t) =>
        tab === "cancelled" ? t.status === "cancelled" : tab === "completed" ? t.status === "completed" : t.status === "upcoming" || t.status === "changed"
      ),
    [trips, tab]
  );
  const hotelList = useMemo(
    () => hotels.filter((t) => (tab === "cancelled" ? t.status === "cancelled" : tab === "completed" ? t.status === "completed" : t.status === "upcoming")),
    [hotels, tab]
  );
  const busList = useMemo(
    () => buses.filter((t) => (tab === "cancelled" ? t.status === "cancelled" : tab === "completed" ? t.status === "completed" : t.status === "upcoming")),
    [buses, tab]
  );

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="My Trips"
        subtitle="Flights, hotels and buses — cancel, change and refund (demo)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/travel/hotels">Hotels</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/travel/bus">Bus</Link>
            </Button>
            <Button asChild>
              <Link to="/travel/flights">Flights</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(["flights", "hotels", "buses"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${kind === id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {id}
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        {(["upcoming", "completed", "cancelled"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${tab === id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {id}
          </button>
        ))}
      </div>

      {kind === "flights" ? (
        list.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <div className="space-y-3">
            {list.map((t) => (
              <Card key={t.pnr} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs text-muted-foreground">PNR {t.pnr} · {t.status}</p>
                    <p className="font-semibold">
                      {cityByCode(t.search.from).city} → {cityByCode(t.search.to).city}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.flight.airline} {t.flight.code} · {formatDateLabel(t.search.depart)}
                    </p>
                    <p className="text-sm font-medium">{formatInr(t.total ?? 0)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.status === "upcoming" || t.status === "changed" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { writeTrips(trips.map((x) => (x.pnr === t.pnr ? { ...x, search: { ...x.search, depart: addDays(x.search.depart, 1) }, status: "changed" } : x))); setTrips(readTrips()); toast({ title: "Date changed" }); }}>
                          Change date
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { writeTrips(trips.map((x) => (x.pnr === t.pnr ? { ...x, status: "cancelled" } : x))); setTrips(readTrips()); toast({ title: "Cancelled" }); }}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Refund in 5–7 days (demo)" })}>
                        Refund status
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {kind === "hotels" ? (
        hotelList.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <div className="space-y-3">
            {hotelList.map((t) => (
              <Card key={t.confirmation} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.confirmation} · {t.status}</p>
                    <p className="font-semibold">{t.hotel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.search.city} · {t.search.checkIn} → {t.search.checkOut}
                    </p>
                    <p className="text-sm font-medium">{formatInr(t.total ?? 0)}</p>
                  </div>
                  {t.status === "upcoming" ? (
                    <Button size="sm" variant="destructive" onClick={() => { const next = hotels.map((x) => (x.confirmation === t.confirmation ? { ...x, status: "cancelled" as const } : x)); writeHotelTrips(next); setHotels(next); toast({ title: "Stay cancelled" }); }}>
                      Cancel
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {kind === "buses" ? (
        busList.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <div className="space-y-3">
            {busList.map((t) => (
              <Card key={t.pnr} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs text-muted-foreground">PNR {t.pnr} · {t.status}</p>
                    <p className="font-semibold">
                      {t.search.from} → {t.search.to}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.bus.company} · {t.search.date} · seats {t.seats.map((s) => s.id).join(", ")}
                    </p>
                    <p className="text-sm font-medium">{formatInr(t.total ?? 0)}</p>
                  </div>
                  {t.status === "upcoming" ? (
                    <Button size="sm" variant="destructive" onClick={() => { const next = buses.map((x) => (x.pnr === t.pnr ? { ...x, status: "cancelled" as const } : x)); writeBusTrips(next); setBuses(next); toast({ title: "Ticket cancelled" }); }}>
                      Cancel
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </ServicesPageLayout>
  );
}

function Empty({ tab }: { tab: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 text-sm text-muted-foreground">No {tab} trips yet.</CardContent>
    </Card>
  );
}
