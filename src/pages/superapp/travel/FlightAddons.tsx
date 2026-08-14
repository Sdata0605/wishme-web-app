import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MEALS,
  type AddOns,
  type MealPick,
  defaultAddons,
  formatInr,
  isInternational,
  readBooking,
  writeBooking,
} from "@/lib/superapp/flights";

export default function FlightAddons() {
  const stored = readBooking();
  const navigate = useNavigate();
  const [addons, setAddons] = useState<AddOns>(stored?.addons ?? defaultAddons());
  const [meals, setMeals] = useState<MealPick[]>(stored?.meals ?? []);

  if (!stored) return <Navigate to="/travel/flights" replace />;

  const pax = stored.travellers ?? [];
  const intl = isInternational(stored.search.from, stored.search.to);

  function toggle(key: keyof AddOns) {
    setAddons((a) => ({ ...a, [key]: !a[key] }));
  }

  function next() {
    writeBooking({ ...stored, addons, meals });
    navigate("/travel/flights/review");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Add-ons" subtitle="Meals, baggage, insurance, lounge, transfers and alerts" />
      <FlightStepper current="addons" />

      <div className="space-y-4">
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <h3 className="font-semibold">Pre-book meals</h3>
            {pax.map((t, i) => (
              <label key={i} className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {t.firstName || `Traveller ${i + 1}`}
                </span>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={meals.find((m) => m.paxIndex === i)?.meal ?? ""}
                  onChange={(e) => {
                    const meal = MEALS.find((m) => m.id === e.target.value);
                    setMeals((prev) => {
                      const rest = prev.filter((m) => m.paxIndex !== i);
                      if (!meal) return rest;
                      return [...rest, { paxIndex: i, meal: meal.id, price: meal.price }];
                    });
                  }}
                >
                  <option value="">No meal</option>
                  {MEALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {formatInr(m.price)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <h3 className="font-semibold">Extra baggage</h3>
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={addons.extraBaggageKg}
              onChange={(e) => setAddons((a) => ({ ...a, extraBaggageKg: Number(e.target.value) }))}
            >
              {[0, 5, 10, 15, 20].map((kg) => (
                <option key={kg} value={kg}>
                  {kg === 0 ? "No extra bag" : `+${kg} kg · ${formatInr(kg * 450)}`}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>Travel insurance · ₹199 / pax</span>
              <input type="checkbox" checked={addons.insurance} onChange={() => toggle("insurance")} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Airport transfer · ₹899</span>
              <input type="checkbox" checked={addons.transfer} onChange={() => toggle("transfer")} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Lounge access · ₹1,299 / pax</span>
              <input type="checkbox" checked={addons.lounge} onChange={() => toggle("lounge")} className="accent-primary" />
            </label>
            {intl ? (
              <>
                <label className="flex items-center justify-between gap-3">
                  <span>Visa assist · ₹2,499</span>
                  <input type="checkbox" checked={addons.visa} onChange={() => toggle("visa")} className="accent-primary" />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Forex card setup · ₹199</span>
                  <input type="checkbox" checked={addons.forex} onChange={() => toggle("forex")} className="accent-primary" />
                </label>
              </>
            ) : null}
            <label className="flex items-center justify-between gap-3">
              <span>WhatsApp ticket alerts</span>
              <input type="checkbox" checked={addons.whatsapp} onChange={() => toggle("whatsapp")} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>SMS ticket alerts</span>
              <input type="checkbox" checked={addons.sms} onChange={() => toggle("sms")} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Price-drop alerts on this route</span>
              <input type="checkbox" checked={addons.priceDropAlert} onChange={() => toggle("priceDropAlert")} className="accent-primary" />
            </label>
          </CardContent>
        </Card>
      </div>

      <Button className="mt-4 rounded-xl" onClick={next}>
        Continue to review
      </Button>
    </ServicesPageLayout>
  );
}
