import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Select Celebrity" as a row of choice chips (the control the app uses), listing only the celebrities
 * the user has subscribed to. Clicking the chosen chip again clears it.
 */
export function SubscribedCelebrityChips<T extends { id: string; name: string }>({
  celebrities,
  loading,
  hasNone,
  selectedId,
  onSelect,
  priceFor,
  emptyText = "Subscribe to a celebrity to use this service.",
}: {
  celebrities: T[];
  loading: boolean;
  /** The user has no subscription at all (as opposed to none that offer this service). */
  hasNone: boolean;
  selectedId: string | null | undefined;
  onSelect: (celebrity: T | null) => void;
  /** Shown on each chip. Return null/0 to mark a celebrity as not offering this service (the chip is hidden). */
  priceFor?: (celebrity: T) => number | null;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <div className="py-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const offered = priceFor ? celebrities.filter((c) => (priceFor(c) ?? 0) > 0) : celebrities;

  if (hasNone || offered.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {hasNone ? emptyText : "None of your subscribed celebrities offer this service yet."}
        </p>
        <Button asChild size="sm">
          <Link to="/celebrities">Browse &amp; Subscribe</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select celebrity">
      {offered.map((c) => {
        const on = selectedId === c.id;
        const price = priceFor?.(c);
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(on ? null : c)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted hover:border-primary/60"
            )}
          >
            {c.name}
            {price ? (
              <span className={cn("text-xs font-semibold", on ? "text-primary-foreground" : "text-muted-foreground")}>
                ₹{price.toLocaleString("en-IN")}
              </span>
            ) : null}
            {on ? <Check className="w-3.5 h-3.5" /> : null}
          </button>
        );
      })}
    </div>
  );
}
