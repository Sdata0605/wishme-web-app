import { Link, Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateLabel, formatInr, readHotel } from "@/lib/superapp/hotels";

export default function HotelVoucher() {
  const stored = readHotel();
  if (!stored?.confirmation) return <Navigate to="/travel/hotels" replace />;
  return (
    <ServicesPageLayout>
      <Card className="mx-auto max-w-lg rounded-2xl">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold">Hotel booked</h1>
          <p className="mt-2 text-sm text-muted-foreground">Voucher {stored.confirmation}</p>
          <p className="mt-3 font-medium">{stored.hotel.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateLabel(stored.search.checkIn)} – {formatDateLabel(stored.search.checkOut)}
          </p>
          <p className="mt-1">{formatInr(stored.total ?? 0)}</p>
          <div className="mt-6 flex justify-center gap-3 print:hidden">
            <Button onClick={() => window.print()}>Print voucher</Button>
            <Button variant="outline" asChild>
              <Link to="/travel/trips">My Trips</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ServicesPageLayout>
  );
}
