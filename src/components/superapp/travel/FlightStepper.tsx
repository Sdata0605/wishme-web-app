import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "search", label: "Search", to: "/travel/flights" },
  { id: "results", label: "Flights", to: "/travel/flights/results" },
  { id: "fares", label: "Fares", to: "/travel/flights/fares" },
  { id: "travellers", label: "Travellers", to: "/travel/flights/travellers" },
  { id: "seats", label: "Seats", to: "/travel/flights/seats" },
  { id: "addons", label: "Add-ons", to: "/travel/flights/addons" },
  { id: "review", label: "Review", to: "/travel/flights/review" },
  { id: "pay", label: "Pay", to: "/travel/flights/pay" },
] as const;

export function FlightStepper({ current }: { current: (typeof STEPS)[number]["id"] }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex flex-wrap gap-1 text-xs font-medium sm:gap-2">
      {STEPS.map((step, i) => {
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
