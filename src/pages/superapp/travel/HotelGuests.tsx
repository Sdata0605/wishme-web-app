import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FIELD_CLASS, type HotelGuest, readHotel, writeHotel } from "@/lib/superapp/hotels";

export default function HotelGuests() {
  const stored = readHotel();
  const navigate = useNavigate();
  const [guests, setGuests] = useState<HotelGuest[]>(stored?.guests ?? [{ firstName: "", lastName: "", email: "", phone: "" }]);
  const [gst, setGst] = useState(stored?.gst ?? { enabled: false, gstin: "", company: "" });

  if (!stored) return <Navigate to="/travel/hotels" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    writeHotel({ ...stored, guests, gst });
    navigate("/travel/hotels/review");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Guest details" subtitle={`${stored.hotel.name} · ${stored.room.name}`} />
      <TravelStepper steps={HOTEL_STEPS} current="guests" />
      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="rounded-2xl">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">First name</span>
              <input required className={FIELD_CLASS} value={guests[0].firstName} onChange={(e) => setGuests([{ ...guests[0], firstName: e.target.value }])} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Last name</span>
              <input required className={FIELD_CLASS} value={guests[0].lastName} onChange={(e) => setGuests([{ ...guests[0], lastName: e.target.value }])} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Email</span>
              <input required type="email" className={FIELD_CLASS} value={guests[0].email} onChange={(e) => setGuests([{ ...guests[0], email: e.target.value }])} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Mobile</span>
              <input required className={FIELD_CLASS} value={guests[0].phone} onChange={(e) => setGuests([{ ...guests[0], phone: e.target.value }])} />
            </label>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="accent-primary" checked={gst.enabled} onChange={(e) => setGst((g) => ({ ...g, enabled: e.target.checked }))} />
              GST invoice
            </label>
            {gst.enabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input placeholder="GSTIN" className={FIELD_CLASS} value={gst.gstin} onChange={(e) => setGst((g) => ({ ...g, gstin: e.target.value }))} />
                <input placeholder="Company" className={FIELD_CLASS} value={gst.company} onChange={(e) => setGst((g) => ({ ...g, company: e.target.value }))} />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Button type="submit" className="rounded-xl">Continue</Button>
      </form>
    </ServicesPageLayout>
  );
}
