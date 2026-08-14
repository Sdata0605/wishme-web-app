import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ServicesPageHeader, ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { TravelStepper, BUS_STEPS } from "@/components/superapp/travel/TravelStepper";
import { Button } from "@/components/ui/button";
import { type BusSeat, formatInr, isSeatTaken, readBus, seatPrice, writeBus } from "@/lib/superapp/buses";
import { cn } from "@/lib/utils";

function Deck({
  deck,
  selected,
  busId,
  sleeper,
  luxury,
  onToggle,
}: {
  deck: "L" | "U";
  selected: Set<string>;
  busId: string;
  sleeper: boolean;
  luxury: boolean;
  onToggle: (seat: BusSeat) => void;
}) {
  const rows = sleeper ? 8 : 10;
  const cols = sleeper ? ["A", "B", "C"] : ["A", "B", "C", "D"];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{deck === "L" ? "Lower" : "Upper"} deck</p>
      {Array.from({ length: rows }, (_, r) => r + 1).map((row) => (
        <div key={row} className="mb-1 flex items-center gap-1">
          <span className="w-5 text-[10px] text-muted-foreground">{row}</span>
          {cols.map((col, ci) => {
            const id = `${deck}${row}${col}`;
            const taken = isSeatTaken(id, busId);
            const mine = selected.has(id);
            const aisle = sleeper ? ci === 0 : ci === 1;
            return (
              <span key={id} className="contents">
                {aisle ? <span className="w-4" /> : null}
                <button
                  type="button"
                  disabled={taken}
                  onClick={() => onToggle({ id, deck, price: seatPrice(sleeper, luxury) })}
                  className={cn(
                    "h-8 w-8 rounded-md text-[10px] font-medium",
                    taken && "bg-muted text-muted-foreground",
                    mine && "bg-primary text-primary-foreground",
                    !taken && !mine && "bg-primary/10 text-primary"
                  )}
                >
                  {col}
                </button>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function BusSeats() {
  const stored = readBus();
  const navigate = useNavigate();
  const [seats, setSeats] = useState<BusSeat[]>(stored?.seats ?? []);
  if (!stored) return <Navigate to="/travel/bus" replace />;

  const selected = new Set(seats.map((s) => s.id));
  function toggle(seat: BusSeat) {
    setSeats((prev) => (prev.some((s) => s.id === seat.id) ? prev.filter((s) => s.id !== seat.id) : [...prev, seat]));
  }

  return (
    <ServicesPageLayout>
      <Link to="/all-services" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All Services
      </Link>
      <ServicesPageHeader title="Select seats" subtitle={`${stored.bus.company} · ${stored.bus.layout}`} />
      <TravelStepper steps={BUS_STEPS} current="seats" />
      <div className="grid gap-4 md:grid-cols-2">
        <Deck deck="L" selected={selected} busId={stored.bus.id} sleeper={stored.bus.sleeper} luxury={stored.bus.luxury} onToggle={toggle} />
        {stored.bus.sleeper ? (
          <Deck deck="U" selected={selected} busId={stored.bus.id} sleeper={stored.bus.sleeper} luxury={stored.bus.luxury} onToggle={toggle} />
        ) : null}
      </div>
      <p className="mt-3 text-sm">
        {seats.length} seat(s) · {formatInr(seats.reduce((s, x) => s + x.price, 0))}
      </p>
      <Button
        className="mt-4 rounded-xl"
        disabled={!seats.length}
        onClick={() => {
          writeBus({ ...stored, seats });
          navigate("/travel/bus/points");
        }}
      >
        Continue
      </Button>
    </ServicesPageLayout>
  );
}
