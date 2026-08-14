import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { busTotal, formatDateLabel, formatInr, readBus, upsertBusTrip, writeBus } from "@/lib/superapp/buses";

export default function BusPay() {
  const stored = readBus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  if (!stored) return <Navigate to="/travel/bus" replace />;
  const total = busTotal(stored);

  function pay() {
    setBusy(true);
    window.setTimeout(() => {
      const pnr = `RB${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const trip = { ...stored, pnr, status: "upcoming" as const, total };
      writeBus(trip);
      upsertBusTrip(trip);
      toast({ title: "Ticket issued", description: `PNR ${pnr} · emailed to ${stored.contact.email}` });
      navigate("/travel/bus/ticket");
    }, 600);
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Pay" subtitle={`${stored.search.from} → ${stored.search.to} · ${formatDateLabel(stored.search.date)}`} />
      <TravelStepper steps={BUS_STEPS} current="pay" />
      <Card className="mb-4 rounded-2xl">
        <CardContent className="space-y-1 p-5 text-sm">
          <p>{stored.bus.company} · seats {stored.seats.map((s) => s.id).join(", ")}</p>
          <p className="text-muted-foreground">Board {stored.boarding?.name} · Drop {stored.dropping?.name}</p>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {["upi", "card", "netbanking", "wallet"].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm capitalize ${method === id ? "border-primary bg-primary/10" : "border-border"}`}
          >
            {id}
          </button>
        ))}
      </div>
      <p className="mt-4 text-3xl font-bold">{formatInr(total)}</p>
      <Button className="mt-3 w-full rounded-xl" disabled={busy} onClick={pay}>
        {busy ? "Processing…" : `Pay ${formatInr(total)}`}
      </Button>
    </ServicesPageLayout>
  );
}
