import { Link, Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cityByCode, formatDateLabel, formatInr, readBooking } from "@/lib/superapp/flights";

export default function FlightTicket() {
  const stored = readBooking();
  if (!stored?.pnr) return <Navigate to="/travel/flights" replace />;

  const { search, flight, returnFlight, pnr, total, contact, travellers } = stored;

  function printTicket() {
    window.print();
  }

  return (
    <ServicesPageLayout>
      <Card className="mx-auto max-w-lg rounded-2xl print:shadow-none">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold">Booking confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Demo e-ticket · emailed to {contact?.email || "your inbox"}</p>
          <p className="mt-4 text-lg font-semibold">PNR {pnr}</p>
          <p className="mt-2 text-sm">
            {flight.airline} {flight.code} · {cityByCode(search.from).city} → {cityByCode(search.to).city}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDateLabel(search.depart)} · {flight.depart}–{flight.arrive}
          </p>
          {returnFlight ? (
            <p className="text-sm text-muted-foreground">
              Return {returnFlight.code} · {formatDateLabel(search.returnDate)}
            </p>
          ) : null}
          <p className="mt-2 text-sm">{(travellers ?? []).map((t) => `${t.firstName} ${t.lastName}`).join(", ")}</p>
          <p className="mt-1 font-medium">{formatInr(total ?? 0)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
            <Button onClick={printTicket}>Print / save PDF</Button>
            <Button variant="outline" asChild>
              <Link to="/travel/trips">My Trips</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/travel/flights">Book another</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ServicesPageLayout>
  );
}
