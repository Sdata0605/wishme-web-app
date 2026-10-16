import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Everything that decides, and shows, what a celebrity earns, in one place:
 *  - the cut they get on orders and calls (editable here, saved with the rest of the celebrity),
 *  - what each service pays them at its current price,
 *  - the subscription cut (its own pricing record, edited in its own dialog),
 *  - what they have actually earned so far, by source, with TDS.
 */

interface PanelCelebrity {
  id: string;
  commission_percentage?: number;
  service_prices?: Record<string, number> | null;
  voice_call_price?: number | null;
  total_earnings?: number;
  available_balance?: number;
}

interface SubscriptionCut {
  price: number;
  celebrity_commission_percentage: number;
  referrer_commission_percentage: number;
  is_enabled: boolean;
}

interface LedgerRow {
  order_type: string | null;
  description: string | null;
  amount: number | null;
  gross_amount: number | null;
  tds_amount: number | null;
  transaction_type: string | null;
}

const SOURCES: { key: string; label: string }[] = [
  { key: "booking", label: "Video wishes & promotions (bookings)" },
  { key: "image_promotion", label: "Image promotions (AI)" },
  { key: "voice_call", label: "Voice calls" },
  { key: "wish_celebrity_order", label: "Wish a Celebrity" },
  { key: "subscription", label: "Subscriptions" },
  { key: "other", label: "Other" },
];

/** Older ledger rows have no order_type, so fall back to what their description says. */
function sourceOf(row: LedgerRow): string {
  if (row.order_type && SOURCES.some((s) => s.key === row.order_type)) return row.order_type;
  const d = (row.description ?? "").toLowerCase();
  if (d.includes("subscription")) return "subscription";
  if (d.includes("voice call")) return "voice_call";
  if (d.includes("video_wish") || d.includes("image_promotion") || d.includes("video_promotion")) return "booking";
  return "other";
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function CelebrityCommissionPanel({
  celebrity,
  subscription,
  onCommissionChange,
  onEditSubscription,
}: {
  celebrity: PanelCelebrity;
  subscription?: SubscriptionCut;
  onCommissionChange: (pct: number) => void;
  onEditSubscription: () => void;
}) {
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const pct = celebrity.commission_percentage ?? 70;

  useEffect(() => {
    let cancelled = false;
    setLedger(null);
    (async () => {
      const { data } = await (supabase as any)
        .from("celebrity_wallet_transactions")
        .select("order_type, description, amount, gross_amount, tds_amount, transaction_type")
        .eq("celebrity_id", celebrity.id)
        .eq("transaction_type", "earning")
        .limit(5000);
      if (!cancelled) setLedger((data ?? []) as LedgerRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [celebrity.id]);

  const bySource = useMemo(() => {
    const totals = new Map<string, { count: number; gross: number; tds: number; net: number }>();
    for (const row of ledger ?? []) {
      const key = sourceOf(row);
      const t = totals.get(key) ?? { count: 0, gross: 0, tds: 0, net: 0 };
      t.count += 1;
      t.gross += Number(row.gross_amount ?? row.amount ?? 0);
      t.tds += Number(row.tds_amount ?? 0);
      t.net += Number(row.amount ?? 0);
      totals.set(key, t);
    }
    return totals;
  }, [ledger]);

  const prices = celebrity.service_prices ?? {};
  const services: { label: string; price: number }[] = [
    { label: "General wish (video)", price: Number(prices.general_wish ?? 0) },
    { label: "Image promotion", price: Number(prices.image_promotion ?? 0) },
    { label: "Video promotion", price: Number(prices.video_promotion ?? 0) },
    { label: "Voice call (per call)", price: Number(celebrity.voice_call_price ?? 0) },
  ];

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h4 className="font-semibold text-sm">Commission &amp; earnings</h4>
        <p className="text-xs text-muted-foreground">
          What this celebrity is paid. TDS is taken off their share automatically.
        </p>
      </div>

      <div>
        <Label htmlFor="editCommission">Celebrity commission on orders &amp; calls (%)</Label>
        <Input
          id="editCommission"
          type="number"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => onCommissionChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Applies to video wishes, image and video promotions, voice calls and Wish a Celebrity orders. The platform keeps the rest.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-2 font-medium">Service</th>
              <th className="py-1 pr-2 font-medium text-right">User pays</th>
              <th className="py-1 font-medium text-right">Celebrity gets ({pct}%)</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.label} className="border-t">
                <td className="py-1 pr-2">{s.label}</td>
                <td className="py-1 pr-2 text-right">{s.price > 0 ? rupees(s.price) : "not set"}</td>
                <td className="py-1 text-right">{s.price > 0 ? rupees((s.price * pct) / 100) : "-"}</td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="py-1 pr-2">
                Subscription{" "}
                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onEditSubscription}>
                  edit
                </Button>
              </td>
              <td className="py-1 pr-2 text-right">
                {subscription ? (subscription.is_enabled ? rupees(subscription.price) : "disabled") : "not set"}
              </td>
              <td className="py-1 text-right">
                {subscription
                  ? `${rupees((subscription.price * subscription.celebrity_commission_percentage) / 100)} (${subscription.celebrity_commission_percentage}%)` +
                    ` · referrer ${subscription.referrer_commission_percentage}%`
                  : "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-xs font-medium mb-1">Earned so far</p>
        {ledger === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : ledger.length === 0 ? (
          <p className="text-xs text-muted-foreground">No earnings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Source</th>
                  <th className="py-1 pr-2 font-medium text-right">Orders</th>
                  <th className="py-1 pr-2 font-medium text-right">Share</th>
                  <th className="py-1 pr-2 font-medium text-right">TDS</th>
                  <th className="py-1 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.filter((s) => bySource.has(s.key)).map((s) => {
                  const t = bySource.get(s.key)!;
                  return (
                    <tr key={s.key} className="border-t">
                      <td className="py-1 pr-2">{s.label}</td>
                      <td className="py-1 pr-2 text-right">{t.count}</td>
                      <td className="py-1 pr-2 text-right">{rupees(t.gross)}</td>
                      <td className="py-1 pr-2 text-right">{rupees(t.tds)}</td>
                      <td className="py-1 text-right font-medium">{rupees(t.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Balance on the celebrity record: total earned {rupees(celebrity.total_earnings ?? 0)} · available {rupees(celebrity.available_balance ?? 0)}
        </p>
      </div>
    </div>
  );
}
