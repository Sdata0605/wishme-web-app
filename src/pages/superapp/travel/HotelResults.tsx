import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Star } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  AMENITIES,
  formatDateLabel,
  formatInr,
  hotelNights,
  hotelsForCity,
  queryToHotel,
} from "@/lib/superapp/hotels";
import { cn } from "@/lib/utils";

export default function HotelResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const search = useMemo(() => queryToHotel(params), [params]);
  const nights = hotelNights(search);
  const [stars, setStars] = useState<number[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [amenity, setAmenity] = useState<string[]>([]);
  const [freeCancel, setFreeCancel] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [zero, setZero] = useState(false);
  const [payHotel, setPayHotel] = useState(false);
  const [maxPrice, setMaxPrice] = useState(12000);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<"price" | "rating" | "stars">("price");

  const list = useMemo(() => {
    let hotels = hotelsForCity(search.city);
    const q = (search.query || "").toLowerCase();
    if (q) {
      hotels = hotels.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.tags.join(" ").toLowerCase().includes(q) ||
          h.amenities.join(" ").toLowerCase().includes(q) ||
          (q.includes("pet") && h.tags.some((t) => t.toLowerCase().includes("couple") || t.toLowerCase().includes("family"))) ||
          (q.includes("pool") && h.amenities.includes("Pool"))
      );
    }
    if (stars.length) hotels = hotels.filter((h) => stars.includes(h.stars));
    if (types.length) hotels = hotels.filter((h) => types.includes(h.propertyType));
    if (amenity.length) hotels = hotels.filter((h) => amenity.every((a) => h.amenities.includes(a)));
    if (freeCancel) hotels = hotels.filter((h) => h.freeCancel);
    if (breakfast) hotels = hotels.filter((h) => h.breakfast);
    if (zero) hotels = hotels.filter((h) => h.zeroPay);
    if (payHotel) hotels = hotels.filter((h) => h.payAtHotel);
    hotels = hotels.filter((h) => h.price <= maxPrice && h.rating >= minRating);
    hotels = [...hotels].sort((a, b) =>
      sort === "rating" ? b.rating - a.rating : sort === "stars" ? b.stars - a.stars : a.price - b.price
    );
    return hotels;
  }, [search, stars, types, amenity, freeCancel, breakfast, zero, payHotel, maxPrice, minRating, sort]);

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <div className="sticky top-[60px] z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="text-sm font-semibold">
          {search.city} · {formatDateLabel(search.checkIn)} – {formatDateLabel(search.checkOut)} · {nights} night{nights > 1 ? "s" : ""} · {search.rooms} room
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/travel/hotels?${params.toString()}`}>Edit search</Link>
        </Button>
      </div>
      <ServicesPageHeader title={`Hotels in ${search.city}`} subtitle={`${list.length} properties · sample inventory`} />
      <TravelStepper steps={HOTEL_STEPS} current="results" />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["Cheapest", "price"],
          ["Top rated", "rating"],
          ["Stars", "stars"],
        ].map(([label, key]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key as typeof sort)}
            className={cn("rounded-full border px-3 py-1 text-xs", sort === key ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={() => setFreeCancel((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", freeCancel ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Free cancellation
        </button>
        <button type="button" onClick={() => setZero((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", zero ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Book with ₹0
        </button>
        <button type="button" onClick={() => setPayHotel((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", payHotel ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Pay at hotel
        </button>
        <button type="button" onClick={() => setBreakfast((v) => !v)} className={cn("rounded-full border px-3 py-1 text-xs", breakfast ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Breakfast
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Stars</p>
          <div className="flex gap-1">
            {[3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStars((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
                className={cn("rounded-full border px-2 py-0.5 text-[11px]", stars.includes(s) ? "border-primary text-primary" : "border-border")}
              >
                {s}★
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Type</p>
          <div className="flex flex-wrap gap-1">
            {["Hotel", "Resort", "Homestay", "Apartment"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
                className={cn("rounded-full border px-2 py-0.5 text-[11px]", types.includes(t) ? "border-primary text-primary" : "border-border")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Max {formatInr(maxPrice)} · min {minRating}+ rating</p>
          <Slider value={[maxPrice]} min={1500} max={15000} step={250} onValueChange={(v) => setMaxPrice(v[0])} className="mt-2" />
          <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={(v) => setMinRating(v[0])} className="mt-3" />
        </div>
        <div className="sm:col-span-3 flex flex-wrap gap-1">
          {AMENITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmenity((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}
              className={cn("rounded-full border px-2 py-0.5 text-[11px]", amenity.includes(a) ? "border-primary text-primary" : "border-border")}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {list.map((h) => (
          <Card key={h.id} className="rounded-2xl">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex h-24 w-full shrink-0 items-end rounded-xl bg-gradient-primary p-3 text-white sm:w-40">
                <span className="text-xs font-semibold">{h.propertyType}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{h.area} · {h.distance}</p>
                <h3 className="font-semibold">{h.name}</h3>
                <p className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 text-primary" /> {h.rating} · {h.reviews} reviews · {h.stars} star
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {h.tags.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {t}
                    </span>
                  ))}
                  {h.freeCancel ? <span className="text-[10px] font-medium text-primary">Free cancellation</span> : null}
                  {h.zeroPay ? <span className="text-[10px] font-medium text-primary">Book ₹0</span> : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground line-through">{formatInr(h.originalPrice)}</p>
                <p className="text-xl font-semibold">{formatInr(h.price)}</p>
                <p className="text-[11px] text-muted-foreground">per night</p>
                <Button className="mt-2" size="sm" onClick={() => navigate(`/travel/hotels/${h.id}?${params.toString()}`)}>
                  View rooms
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ServicesPageLayout>
  );
}
