import { Link, Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateLabel, formatInr, readBus } from "@/lib/superapp/buses";

export default function BusTicket() {
  const stored = readBus();
  if (!stored?.pnr) return <Navigate to="/travel/bus" replace />;
  return (
    <ServicesPageLayout>
      <Card className="mx-auto max-w-lg rounded-2xl">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold">Bus ticket confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">PNR {stored.pnr}</p>
          <p className="mt-3 font-medium">
            {stored.search.from} → {stored.search.to}
          </p>
          <p className="text-sm text-muted-foreground">
            {stored.bus.company} · {formatDateLabel(stored.search.date)} · {stored.bus.depart}
          </p>
          <p className="text-sm">Seats {stored.seats.map((s) => s.id).join(", ")}</p>
          <p className="text-sm text-muted-foreground">Board {stored.boarding?.name}</p>
          <p className="mt-2 font-medium">{formatInr(stored.total ?? 0)}</p>
          <div className="mt-6 flex justify-center gap-3 print:hidden">
            <Button onClick={() => window.print()}>Print / save</Button>
            <Button variant="outline" asChild>
              <Link to="/travel/trips">My Tickets</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ServicesPageLayout>
  );
}
