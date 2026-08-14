import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HOTEL_COUPONS,
  formatDateLabel,
  formatInr,
  hotelNights,
  hotelTotal,
  readHotel,
  writeHotel,
} from "@/lib/superapp/hotels";

export default function HotelReview() {
  const stored = readHotel();
  const navigate = useNavigate();
  const [breakfastAdd, setBreakfastAdd] = useState(stored?.breakfastAdd ?? false);
  const [extraBed, setExtraBed] = useState(stored?.extraBed ?? false);
  const [insurance, setInsurance] = useState(stored?.insurance ?? false);
  const [code, setCode] = useState("");
  const [off, setOff] = useState(stored?.couponOff ?? 0);

  if (!stored) return <Navigate to="/travel/hotels" replace />;

  const draft = { ...stored, breakfastAdd, extraBed, insurance, couponOff: off };
  const total = hotelTotal(draft);
  const nights = hotelNights(stored.search);

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Review stay" subtitle={`${stored.hotel.name} · ${nights} night(s)`} />
      <TravelStepper steps={HOTEL_STEPS} current="review" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-semibold">{stored.room.name}</p>
            <p>
              {formatDateLabel(stored.search.checkIn)} → {formatDateLabel(stored.search.checkOut)}
            </p>
            <p className="text-muted-foreground">
              {stored.guests[0]?.firstName} {stored.guests[0]?.lastName} · {stored.search.adults} adults
            </p>
            <label className="flex items-center justify-between pt-2">
              <span>Add breakfast · ₹450 / adult / night</span>
              <input type="checkbox" className="accent-primary" checked={breakfastAdd} onChange={(e) => setBreakfastAdd(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span>Extra bed · ₹700 / night</span>
              <input type="checkbox" className="accent-primary" checked={extraBed} onChange={(e) => setExtraBed(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span>Travel insurance · ₹149 / adult</span>
              <input type="checkbox" className="accent-primary" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
            </label>
            <div className="flex gap-2 pt-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WISHSTAY / HOTEL500" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const key = code.trim().toUpperCase();
                  const val = HOTEL_COUPONS[key];
                  setOff(val ? (val <= 20 ? Math.round(stored.room.price * nights * (val / 100)) : val) : 0);
                }}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Payable</p>
            <p className="text-3xl font-bold">{formatInr(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Includes ₹99 convenience / room</p>
            <Button
              className="mt-4 w-full rounded-xl"
              onClick={() => {
                writeHotel(draft);
                navigate("/travel/hotels/pay");
              }}
            >
              Continue to pay
            </Button>
          </CardContent>
        </Card>
      </div>
    </ServicesPageLayout>
  );
}
