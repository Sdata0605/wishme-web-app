import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TravelStepper({
  steps,
  current,
}: {
  steps: readonly { id: string; label: string; to: string }[];
  current: string;
}) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex flex-wrap gap-1 text-xs font-medium sm:gap-2">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            {i > 0 ? <span className="text-muted-foreground/40">/</span> : null}
            <Link
              to={i <= idx ? step.to : "#"}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/10 text-primary",
                !active && !done && "pointer-events-none bg-muted text-muted-foreground"
              )}
            >
              {i + 1}. {step.label}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export const HOTEL_STEPS = [
  { id: "search", label: "Search", to: "/travel/hotels" },
  { id: "results", label: "Hotels", to: "/travel/hotels/results" },
  { id: "detail", label: "Room", to: "/travel/hotels/results" },
  { id: "guests", label: "Guests", to: "/travel/hotels/guests" },
  { id: "review", label: "Review", to: "/travel/hotels/review" },
  { id: "pay", label: "Pay", to: "/travel/hotels/pay" },
] as const;

export const BUS_STEPS = [
  { id: "search", label: "Search", to: "/travel/bus" },
  { id: "results", label: "Buses", to: "/travel/bus/results" },
  { id: "seats", label: "Seats", to: "/travel/bus/seats" },
  { id: "points", label: "Stops", to: "/travel/bus/points" },
  { id: "passenger", label: "Passenger", to: "/travel/bus/passenger" },
  { id: "pay", label: "Pay", to: "/travel/bus/pay" },
] as const;
