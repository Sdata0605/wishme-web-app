import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FARE_TIERS,
  MEALS,
  PAYMENT_OPTIONS,
  bookingTotal,
  cityByCode,
  formatDateLabel,
  formatInr,
  readBooking,
} from "@/lib/superapp/flights";

export default function FlightReview() {
  const stored = readBooking();
  const navigate = useNavigate();
  if (!stored) return <Navigate to="/travel/flights" replace />;

  const { search, flight, returnFlight, fareKey, protection, travellers, contact, gst, seats, meals, addons, coupon, couponOff, priceLock } = stored;
  const fare = FARE_TIERS.find((t) => t.key === fareKey) ?? FARE_TIERS[1];
  const total = bookingTotal(stored);

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Review booking" subtitle="Check itinerary, travellers, add-ons and fees before pay" />
      <FlightStepper current="review" />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-5 text-sm">
              <h3 className="font-semibold">Itinerary</h3>
              <p>
                {cityByCode(search.from).city} ({search.from}) → {cityByCode(search.to).city} ({search.to})
              </p>
              <p>
                {flight.airline} {flight.code} · {formatDateLabel(search.depart)} · {flight.depart}–{flight.arrive} · {flight.aircraft}
              </p>
              {returnFlight ? (
                <p>
                  Return {returnFlight.airline} {returnFlight.code} · {formatDateLabel(search.returnDate)} · {returnFlight.depart}–{returnFlight.arrive}
                </p>
              ) : null}
              <p>Fare: {fare.label}{protection ? " · Price drop protection" : ""}{priceLock ? " · Fare locked 24h" : ""}</p>
              {coupon ? <p>Coupon {coupon} · −{formatInr(couponOff ?? 0)}</p> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="space-y-1 p-5 text-sm">
              <h3 className="font-semibold">Travellers</h3>
              {(travellers ?? []).map((t, i) => (
                <p key={i}>
                  {t.firstName} {t.lastName} · {t.type}
                  {t.passport ? ` · ${t.passport}` : ""}
                  {t.frequentFlyer ? ` · FF ${t.frequentFlyer}` : ""}
                </p>
              ))}
              {contact ? <p className="text-muted-foreground">{contact.email} · {contact.phone}</p> : null}
              {gst?.enabled ? <p className="text-muted-foreground">GST {gst.gstin} · {gst.company}</p> : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="space-y-1 p-5 text-sm">
              <h3 className="font-semibold">Add-ons</h3>
              <p>Seats: {(seats ?? []).map((s) => s.seat).join(", ") || "Airline assigned"}</p>
              <p>
                Meals:{" "}
                {(meals ?? []).map((m) => MEALS.find((x) => x.id === m.meal)?.label).filter(Boolean).join(", ") || "None"}
              </p>
              {addons?.extraBaggageKg ? <p>Extra bag +{addons.extraBaggageKg} kg</p> : null}
              {addons?.insurance ? <p>Travel insurance</p> : null}
              {addons?.transfer ? <p>Airport transfer</p> : null}
              {addons?.lounge ? <p>Lounge</p> : null}
              {addons?.visa ? <p>Visa assist</p> : null}
              {addons?.forex ? <p>Forex</p> : null}
              <p className="text-muted-foreground">
                Alerts: {addons?.whatsapp ? "WhatsApp " : ""}
                {addons?.sms ? "SMS " : ""}
                {addons?.priceDropAlert ? "price-drop" : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-5 text-sm">
            <h3 className="font-semibold">Fare summary</h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Base + taxes</dt>
                <dd>{formatInr(total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Includes convenience fee ₹249 / pax</dt>
                <dd />
              </div>
              {PAYMENT_OPTIONS[0] ? (
                <p className="text-xs text-muted-foreground">UPI / Wallet discounts apply on the next step.</p>
              ) : null}
            </dl>
            <p className="mt-4 text-lg font-semibold">Pay {formatInr(total)}</p>
            <Button className="mt-4 w-full rounded-xl" onClick={() => navigate("/travel/flights/pay")}>
              Continue to pay
            </Button>
          </CardContent>
        </Card>
      </div>
    </ServicesPageLayout>
  );
}
