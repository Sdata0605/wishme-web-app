import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Hotel, Search } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FIELD_CLASS,
  HOTEL_CITIES,
  defaultDate,
  hotelSearchQuery,
} from "@/lib/superapp/hotels";

export default function HotelSearch() {
  const navigate = useNavigate();
  const [city, setCity] = useState("Goa");
  const [q, setQ] = useState("");
  const [checkIn, setCheckIn] = useState(defaultDate(1));
  const [checkOut, setCheckOut] = useState(defaultDate(3));
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return HOTEL_CITIES.filter((c) => !s || c.toLowerCase().includes(s) || "pet pool beach heritage".includes(s));
  }, [q]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(
      `/travel/hotels/results?${hotelSearchQuery({ city, checkIn, checkOut, rooms, adults, children, query: q })}`
    );
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="Book hotels"
        subtitle="City, dates, rooms & guests — MakeMyTrip-style flow, Wish Me look"
        actions={
          <Button variant="outline" asChild>
            <Link to="/travel/trips">My Trips</Link>
          </Button>
        }
      />
      <TravelStepper steps={HOTEL_STEPS} current="search" />

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <label className="relative block">
              <span className="mb-1 block text-xs text-muted-foreground">City, area or hotel</span>
              <Input
                value={open ? q : city}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(true);
                }}
                placeholder="Try “pet-friendly Goa with pool”"
              />
              {open ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card p-2 shadow-lg">
                  {matches.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setCity(c);
                        setQ("");
                        setOpen(false);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Check-in</span>
                <input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={FIELD_CLASS} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Check-out</span>
                <input type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={FIELD_CLASS} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Rooms</span>
                <select value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className={FIELD_CLASS}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Adults</span>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={FIELD_CLASS}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Children</span>
                <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className={FIELD_CLASS}>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" size="lg" className="w-full rounded-xl">
              <Search className="h-4 w-4" /> Search hotels
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-5 text-sm">
            <Hotel className="h-5 w-5 text-primary" />
            <p className="font-semibold">Book with ₹0 / pay at hotel</p>
            <p className="text-muted-foreground">Filter free cancellation and zero-payment rooms on the listing, then pay later like MMT.</p>
            <p className="font-semibold pt-2">Popular</p>
            <div className="flex flex-wrap gap-2">
              {["Goa", "Manali", "Jaipur", "Mumbai"].map((c) => (
                <button key={c} type="button" className="rounded-full border border-border px-3 py-1 text-xs" onClick={() => setCity(c)}>
                  {c}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </ServicesPageLayout>
  );
}
