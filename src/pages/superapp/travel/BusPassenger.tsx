import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BUS_COUPONS, type BusPassenger, busTotal, readBus, writeBus } from "@/lib/superapp/buses";
import { FIELD_CLASS } from "@/lib/superapp/hotels";

export default function BusPassenger() {
  const stored = readBus();
  const navigate = useNavigate();
  const count = stored?.seats.length || 1;
  const [passengers, setPassengers] = useState<BusPassenger[]>(
    stored?.passengers.length
      ? stored.passengers
      : Array.from({ length: count }, () => ({ name: "", age: "28", gender: stored?.search.women ? "female" : "male" }))
  );
  const [email, setEmail] = useState(stored?.contact.email ?? "");
  const [phone, setPhone] = useState(stored?.contact.phone ?? "");
  const [state, setState] = useState(stored?.contact.state ?? "Maharashtra");
  const [code, setCode] = useState("");
  const [off, setOff] = useState(stored?.couponOff ?? 0);

  if (!stored) return <Navigate to="/travel/bus" replace />;

  function patch(i: number, next: Partial<BusPassenger>) {
    setPassengers((p) => p.map((x, idx) => (idx === i ? { ...x, ...next } : x)));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      ...stored,
      passengers,
      contact: { email, phone, state },
      coupon: code,
      couponOff: off,
    };
    writeBus({ ...next, total: busTotal(next) });
    navigate("/travel/bus/pay");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Passenger details" subtitle={`${count} seat(s) · ${stored.seats.map((s) => s.id).join(", ")}`} />
      <TravelStepper steps={BUS_STEPS} current="passenger" />
      <form onSubmit={onSubmit} className="space-y-4">
        {passengers.map((p, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
              <h3 className="sm:col-span-3 font-semibold">Passenger {i + 1} · seat {stored.seats[i]?.id}</h3>
              <input required placeholder="Name" className={FIELD_CLASS} value={p.name} onChange={(e) => patch(i, { name: e.target.value })} />
              <input required placeholder="Age" className={FIELD_CLASS} value={p.age} onChange={(e) => patch(i, { age: e.target.value })} />
              <select className={FIELD_CLASS} value={p.gender} onChange={(e) => patch(i, { gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </CardContent>
          </Card>
        ))}
        <Card className="rounded-2xl">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
            <input required type="email" placeholder="Email" className={FIELD_CLASS} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input required placeholder="Mobile" className={FIELD_CLASS} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input required placeholder="State of residence" className={FIELD_CLASS} value={state} onChange={(e) => setState(e.target.value)} />
            <div className="flex gap-2 sm:col-span-3">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BUS50 / FESTIVE300 / WISHBUS" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const val = BUS_COUPONS[code.trim().toUpperCase()];
                  setOff(val || 0);
                }}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
        <Button type="submit" className="rounded-xl">Continue to pay</Button>
      </form>
    </ServicesPageLayout>
  );
}
