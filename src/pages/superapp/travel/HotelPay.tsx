import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatInr, hotelTotal, readHotel, upsertHotelTrip, writeHotel } from "@/lib/superapp/hotels";
import { cn } from "@/lib/utils";

export default function HotelPay() {
  const stored = readHotel();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState(stored?.payMode ?? "now");
  const [busy, setBusy] = useState(false);
  if (!stored) return <Navigate to="/travel/hotels" replace />;

  const draft = { ...stored, payMode: mode };
  const total = hotelTotal(draft);
  const dueNow = mode === "now" ? total : 0;

  function pay() {
    if (mode !== "now" && !stored.room.zeroPay && mode === "zero") return;
    setBusy(true);
    window.setTimeout(() => {
      const confirmation = `WH${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const trip = { ...draft, confirmation, status: "upcoming" as const, total: dueNow || total };
      writeHotel(trip);
      upsertHotelTrip(trip);
      toast({ title: "Stay reserved", description: `Confirmation ${confirmation}` });
      navigate("/travel/hotels/voucher");
    }, 600);
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Pay" subtitle="Pay now, pay at hotel, or book with ₹0 (demo)" />
      <TravelStepper steps={HOTEL_STEPS} current="pay" />
      <div className="grid gap-3">
        {(["now", "hotel", "zero"] as const).map((id) => {
          const disabled = (id === "hotel" && !stored.room.payAtHotel) || (id === "zero" && !stored.room.zeroPay);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setMode(id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm disabled:opacity-40",
                mode === id ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              {id === "now" ? `Pay ${formatInr(total)} now` : id === "hotel" ? "Pay at hotel" : "Book with ₹0 now (pay later)"}
            </button>
          );
        })}
      </div>
      <Card className="mt-4 rounded-2xl">
        <CardContent className="p-5">
          <p className="text-3xl font-bold">Due now {formatInr(dueNow)}</p>
          <Button className="mt-4 w-full rounded-xl" disabled={busy} onClick={pay}>
            {busy ? "Processing…" : "Confirm booking"}
          </Button>
        </CardContent>
      </Card>
    </ServicesPageLayout>
  );
}
