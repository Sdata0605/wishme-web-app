import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Star } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, HOTEL_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatInr, hotelById, queryToHotel, writeHotel } from "@/lib/superapp/hotels";

export default function HotelDetail() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hotel = hotelById(id);
  const search = queryToHotel(params);
  if (!hotel) return <Navigate to="/travel/hotels" replace />;

  return (
    <ServicesPageLayout>
      <Link to={`/travel/hotels/results?${params.toString()}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Results
      </Link>
      <div className="mb-4 h-40 rounded-2xl bg-gradient-primary p-6 text-white">
        <p className="text-xs uppercase tracking-wide text-white/70">{hotel.propertyType} · {hotel.area}</p>
        <h1 className="mt-1 text-3xl font-bold">{hotel.name}</h1>
        <p className="mt-2 flex items-center gap-1 text-sm">
          <Star className="h-4 w-4" /> {hotel.rating} · {hotel.reviews} reviews · {hotel.stars} star
        </p>
      </div>
      <ServicesPageHeader title="Select a room" subtitle={hotel.description} />
      <TravelStepper steps={HOTEL_STEPS} current="detail" />
      <p className="mb-3 text-sm text-muted-foreground">{hotel.distance} · {hotel.amenities.join(" · ")}</p>
      <div className="space-y-3">
        {hotel.rooms.map((room) => (
          <Card key={room.id} className="rounded-2xl">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">{room.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {room.bed} · {room.size} · up to {room.guests} guests
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{room.amenities.join(" · ")}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-medium text-primary">
                  {room.freeCancel ? <span>Free cancellation</span> : null}
                  {room.breakfast ? <span>Breakfast included</span> : null}
                  {room.zeroPay ? <span>Book with ₹0</span> : null}
                  {room.payAtHotel ? <span>Pay at hotel</span> : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground line-through">{formatInr(room.originalPrice)}</p>
                <p className="text-xl font-semibold">{formatInr(room.price)}</p>
                <p className="text-[11px] text-muted-foreground">per night</p>
                <Button
                  className="mt-2"
                  onClick={() => {
                    writeHotel({
                      search,
                      hotel,
                      room,
                      guests: [{ firstName: "", lastName: "", email: "", phone: "" }],
                      breakfastAdd: false,
                      extraBed: false,
                      insurance: false,
                      payMode: room.zeroPay ? "zero" : room.payAtHotel ? "hotel" : "now",
                    });
                    navigate("/travel/hotels/guests");
                  }}
                >
                  Select room
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ServicesPageLayout>
  );
}
