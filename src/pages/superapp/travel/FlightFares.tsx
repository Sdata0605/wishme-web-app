import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FARE_TIERS,
  applyCoupon,
  cityByCode,
  farePrice,
  formatDateLabel,
  formatInr,
  readBooking,
  writeBooking,
} from "@/lib/superapp/flights";
import { cn } from "@/lib/utils";

export default function FlightFares() {
  const stored = readBooking();
  const navigate = useNavigate();
  const [fareKey, setFareKey] = useState(stored?.fareKey ?? "wishspecial");
  const [protection, setProtection] = useState(stored?.protection ?? false);
  const [code, setCode] = useState(stored?.coupon ?? "");
  const [couponOff, setCouponOff] = useState(stored?.couponOff ?? 0);
  const [couponMsg, setCouponMsg] = useState("");

  if (!stored) return <Navigate to="/travel/flights" replace />;

  const { flight, search, returnFlight } = stored;
  const fromCity = cityByCode(search.from);
  const toCity = cityByCode(search.to);
  const pax = search.adults + search.children;

  function apply() {
    const price = farePrice(flight, fareKey, protection) * pax;
    const res = applyCoupon(code, price);
    setCouponOff(res.off);
    setCouponMsg(res.ok ? `Saved ${formatInr(res.off)}` : "Invalid coupon");
    if (res.ok) writeBooking({ ...stored, coupon: res.key, couponOff: res.off });
  }

  function continueBooking() {
    writeBooking({ ...stored, fareKey, protection, coupon: code || stored.coupon, couponOff });
    navigate("/travel/flights/travellers");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="Compare fares"
        subtitle={`${fromCity.city} → ${toCity.city} · ${flight.airline} ${flight.code}${returnFlight ? ` · return ${returnFlight.code}` : ""}`}
        actions={
          <Button variant="link" className="px-0" asChild>
            <Link to="/travel/flights/results">Change flight</Link>
          </Button>
        }
      />
      <FlightStepper current="fares" />

      <Card className="mb-4 rounded-2xl">
        <CardContent className="p-5 text-sm">
          <p className="font-semibold">
            {flight.depart} – {flight.arrive} · {formatDateLabel(search.depart)} · {flight.duration}
          </p>
          {returnFlight ? (
            <p className="mt-1 text-muted-foreground">
              Return {returnFlight.depart} – {returnFlight.arrive} · {formatDateLabel(search.returnDate)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Benefit</th>
              {FARE_TIERS.map((t) => (
                <th key={t.key} className="p-3">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Cabin / check-in", ...FARE_TIERS.map((t) => `${t.baggage.cabin} / ${t.baggage.checkin}`)],
              ["Cancellation fee", ...FARE_TIERS.map((t) => (t.cancelFee ? formatInr(t.cancelFee) : "Free*"))],
              ["Date change fee", ...FARE_TIERS.map((t) => (t.changeFee ? formatInr(t.changeFee) : "Free*"))],
              ["Seats & meals", ...FARE_TIERS.map((t) => (t.seatsAndMeals ? "Included / discounted" : "Paid add-on"))],
            ].map((row) => (
              <tr key={row[0]} className="border-t border-border">
                {row.map((cell, i) => (
                  <td key={i} className="p-3 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {FARE_TIERS.map((tier) => {
          const price = farePrice(flight, tier.key, protection) * pax + (returnFlight ? farePrice(returnFlight, tier.key, false) * pax : 0) - couponOff;
          const active = fareKey === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => setFareKey(tier.key)}
              className={cn(
                "rounded-2xl border bg-card p-4 text-left",
                active ? "border-primary ring-2 ring-primary/20" : "border-border",
                tier.featured && "from-primary/5 bg-gradient-to-b to-card"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{tier.label}</p>
                {tier.badge ? <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{tier.badge}</span> : null}
              </div>
              <p className="mt-2 text-2xl font-semibold">{formatInr(price)}</p>
              <p className="text-xs text-muted-foreground">for {pax} traveller(s)</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {tier.benefits.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">Promo code</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WISH10 / WISHME / FLY500" />
        </label>
        <Button type="button" variant="outline" onClick={apply}>
          Apply
        </Button>
        {couponMsg ? <p className="text-sm text-primary">{couponMsg}</p> : null}
      </div>

      <label className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <input type="checkbox" checked={protection} onChange={(e) => setProtection(e.target.checked)} className="mt-1 accent-primary" />
        <span>
          <span className="font-semibold">Price drop protection · ₹199</span>
          <span className="mt-0.5 block text-muted-foreground">Get alerted if this fare drops after you book.</span>
        </span>
      </label>

      <Button type="button" size="lg" className="mt-4 rounded-xl" onClick={continueBooking}>
        Continue
      </Button>
    </ServicesPageLayout>
  );
}
