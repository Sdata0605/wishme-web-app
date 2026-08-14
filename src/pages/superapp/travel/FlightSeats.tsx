import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { FlightStepper } from "@/components/superapp/travel/FlightStepper";
import { Button } from "@/components/ui/button";
import {
  FARE_TIERS,
  SEAT_COLS,
  SEAT_ROWS,
  type SeatPick,
  formatInr,
  isSeatTaken,
  readBooking,
  seatPrice,
  writeBooking,
} from "@/lib/superapp/flights";
import { cn } from "@/lib/utils";

export default function FlightSeats() {
  const stored = readBooking();
  const navigate = useNavigate();
  const [paxIndex, setPaxIndex] = useState(0);
  const [seats, setSeats] = useState<SeatPick[]>(stored?.seats ?? []);

  if (!stored) return <Navigate to="/travel/flights" replace />;

  const pax = stored.travellers?.length ? stored.travellers : [{ firstName: "Traveller", lastName: "1", type: "adult" as const, gender: "male", dob: "" }];
  const included = FARE_TIERS.find((t) => t.key === stored.fareKey)?.seatsAndMeals;
  const taken = useMemo(() => new Set(seats.map((s) => s.seat)), [seats]);

  function toggle(row: number, col: string) {
    const id = `${row}${col}`;
    if (isSeatTaken(row, col, stored.flight.id)) return;
    setSeats((prev) => {
      const without = prev.filter((s) => s.paxIndex !== paxIndex && s.seat !== id);
      const already = prev.find((s) => s.paxIndex === paxIndex && s.seat === id);
      if (already) return without;
      return [...without, { paxIndex, seat: id, price: included ? 0 : seatPrice(col) }];
    });
  }

  function next() {
    writeBooking({ ...stored, seats });
    navigate("/travel/flights/addons");
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader
        title="Select seats"
        subtitle={included ? "Seat fee waived on Flexi / WishMe fare" : "Window ₹449 · Aisle ₹349 · Middle ₹249"}
      />
      <FlightStepper current="seats" />

      <div className="mb-4 flex flex-wrap gap-2">
        {pax.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPaxIndex(i)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              paxIndex === i ? "border-primary bg-primary/10 text-primary" : "border-border"
            )}
          >
            {(t.firstName || `Pax ${i + 1}`) + (seats.find((s) => s.paxIndex === i) ? ` · ${seats.find((s) => s.paxIndex === i)?.seat}` : "")}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-center text-xs text-muted-foreground">Front of aircraft</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          <span />
          {SEAT_COLS.slice(0, 3).map((c) => (
            <span key={c}>{c}</span>
          ))}
          <span />
          {SEAT_COLS.slice(3).map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {Array.from({ length: SEAT_ROWS }, (_, r) => r + 1).map((row) => (
          <div key={row} className="mt-1 grid grid-cols-7 gap-1">
            <span className="flex items-center justify-center text-[10px] text-muted-foreground">{row}</span>
            {SEAT_COLS.slice(0, 3).map((col) => {
              const id = `${row}${col}`;
              const busy = isSeatTaken(row, col, stored.flight.id);
              const mine = taken.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(row, col)}
                  className={cn(
                    "h-8 rounded-md text-[10px] font-medium",
                    busy && "bg-muted text-muted-foreground",
                    mine && "bg-primary text-primary-foreground",
                    !busy && !mine && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {col}
                </button>
              );
            })}
            <span />
            {SEAT_COLS.slice(3).map((col) => {
              const id = `${row}${col}`;
              const busy = isSeatTaken(row, col, stored.flight.id);
              const mine = taken.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(row, col)}
                  className={cn(
                    "h-8 rounded-md text-[10px] font-medium",
                    busy && "bg-muted text-muted-foreground",
                    mine && "bg-primary text-primary-foreground",
                    !busy && !mine && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {col}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">Seat fees {formatInr(seats.reduce((s, x) => s + x.price, 0))}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => { writeBooking({ ...stored, seats: [] }); navigate("/travel/flights/addons"); }}>
          Skip
        </Button>
        <Button onClick={next}>Continue</Button>
      </div>
    </ServicesPageLayout>
  );
}
