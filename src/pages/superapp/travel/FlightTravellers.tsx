import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FIELD_CLASS,
  type GstInfo,
  type Traveller,
  emptyTravellers,
  isInternational,
  readBooking,
  readSavedPax,
  travellerSummary,
  writeBooking,
  writeSavedPax,
} from "@/lib/superapp/flights";

export default function FlightTravellers() {
  const stored = readBooking();
  const navigate = useNavigate();
  const saved = useMemo(() => readSavedPax(), []);
  const [travellers, setTravellers] = useState<Traveller[]>(stored?.travellers?.length ? stored.travellers : stored ? emptyTravellers(stored.search) : []);
  const [email, setEmail] = useState(stored?.contact?.email ?? "");
  const [phone, setPhone] = useState(stored?.contact?.phone ?? "");
  const [gst, setGst] = useState<GstInfo>(stored?.gst ?? { enabled: false, gstin: "", company: "", email: "" });

  if (!stored) return <Navigate to="/travel/flights" replace />;

  const intl = isInternational(stored.search.from, stored.search.to);

  function patch(i: number, next: Partial<Traveller>) {
    setTravellers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...next } : t)));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    writeSavedPax(travellers.filter((t) => t.firstName && t.lastName));
    writeBooking({ ...stored, travellers, contact: { email, phone }, gst });
    navigate("/travel/flights/seats");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Traveller details" subtitle={`Govt ID / passport · ${travellerSummary(stored.search)}`} />
      <FlightStepper current="travellers" />

      {saved.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {saved.map((p, i) => (
            <button
              key={i}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary"
              onClick={() =>
                setTravellers((prev) => {
                  const next = [...prev];
                  const idx = next.findIndex((t) => !t.firstName);
                  if (idx >= 0) next[idx] = { ...next[idx], ...p, type: next[idx].type };
                  return next;
                })
              }
            >
              Use {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {travellers.map((t, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <h3 className="sm:col-span-2 font-semibold capitalize">
                {t.type} {i + 1}
              </h3>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">First name</span>
                <input required value={t.firstName} onChange={(e) => patch(i, { firstName: e.target.value })} className={FIELD_CLASS} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Last name</span>
                <input required value={t.lastName} onChange={(e) => patch(i, { lastName: e.target.value })} className={FIELD_CLASS} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Gender</span>
                <select value={t.gender} onChange={(e) => patch(i, { gender: e.target.value })} className={FIELD_CLASS}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Date of birth</span>
                <input required type="date" value={t.dob} onChange={(e) => patch(i, { dob: e.target.value })} className={FIELD_CLASS} />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted-foreground">Frequent flyer</span>
                <input value={t.frequentFlyer ?? ""} onChange={(e) => patch(i, { frequentFlyer: e.target.value })} className={FIELD_CLASS} placeholder="Optional" />
              </label>
              {intl ? (
                <>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">Nationality</span>
                    <input required value={t.nationality ?? "IN"} onChange={(e) => patch(i, { nationality: e.target.value })} className={FIELD_CLASS} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">Passport number</span>
                    <input required value={t.passport ?? ""} onChange={(e) => patch(i, { passport: e.target.value })} className={FIELD_CLASS} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-muted-foreground">Passport expiry</span>
                    <input required type="date" value={t.passportExpiry ?? ""} onChange={(e) => patch(i, { passportExpiry: e.target.value })} className={FIELD_CLASS} />
                  </label>
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}

        <Card className="rounded-2xl">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Contact</h3>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Mobile</span>
              <input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD_CLASS} />
            </label>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={gst.enabled} onChange={(e) => setGst((g) => ({ ...g, enabled: e.target.checked }))} className="accent-primary" />
              GST invoice for business travel
            </label>
            {gst.enabled ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <input placeholder="GSTIN" value={gst.gstin} onChange={(e) => setGst((g) => ({ ...g, gstin: e.target.value }))} className={FIELD_CLASS} />
                <input placeholder="Company name" value={gst.company} onChange={(e) => setGst((g) => ({ ...g, company: e.target.value }))} className={FIELD_CLASS} />
                <input placeholder="GST email" type="email" value={gst.email} onChange={(e) => setGst((g) => ({ ...g, email: e.target.value }))} className={FIELD_CLASS} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Button type="submit" className="rounded-xl">
          Continue to seats
        </Button>
      </form>
    </ServicesPageLayout>
  );
}
