import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  PAYMENT_OPTIONS,
  type PaymentMethod,
  bookingTotal,
  formatInr,
  makePnr,
  readBooking,
  upsertTrip,
  writeBooking,
} from "@/lib/superapp/flights";
import { cn } from "@/lib/utils";

export default function FlightPayment() {
  const stored = readBooking();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [busy, setBusy] = useState(false);

  if (!stored) return <Navigate to="/travel/flights" replace />;

  const withMethod = { ...stored, paymentMethod: method };
  const total = bookingTotal(withMethod);
  const off = PAYMENT_OPTIONS.find((p) => p.id === method)?.discount ?? 0;

  function pay() {
    setBusy(true);
    window.setTimeout(() => {
      const pnr = makePnr();
      const trip = {
        ...withMethod,
        pnr,
        status: "upcoming" as const,
        paidAt: new Date().toISOString(),
        total,
      };
      writeBooking(trip);
      upsertTrip(trip);
      toast({
        title: "Ticket issued",
        description: `Demo PNR ${pnr}. Confirmation emailed to ${stored.contact?.email || "your inbox"}.`,
      });
      navigate("/travel/flights/ticket");
    }, 700);
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Pay" subtitle="Demo checkout — UPI, cards, netbanking, wallet & EMI" />
      <FlightStepper current="pay" />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-5">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm",
                  method === opt.id ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <span>{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.discount ? `−${formatInr(opt.discount)}` : "No extra discount"}</span>
              </button>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">3D Secure / UPI collect is simulated. No charge is made.</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Amount payable</p>
            <p className="text-3xl font-bold">{formatInr(total)}</p>
            {off ? <p className="mt-1 text-xs text-primary">{formatInr(off)} instant discount on {method}</p> : null}
            <Button className="mt-4 w-full rounded-xl" disabled={busy} onClick={pay}>
              {busy ? "Processing…" : `Pay ${formatInr(total)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ServicesPageLayout>
  );
}
