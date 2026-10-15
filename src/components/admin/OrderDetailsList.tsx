import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LABELS: Record<string, string> = {
  cta: "Call to action",
  cta_custom: "Custom call to action",
  for_whom: "For",
  link: "Link",
  name: "Their name",
  message: "Message",
  from: "From",
  whatsapp_ok: "OK to WhatsApp customer",
  show_offer: "Show offer on screen",
  title_card: "Title card",
  keep_private: "Keep private (no showcase use)",
  logo: "Logo",
  images: "Product images",
  photos: "Photos",
};

const humanize = (key: string) =>
  LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);
const isImageUrl = (v: string) => /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(v) || v.includes("/promotional-content/");

function Value({ value }: { value: unknown }) {
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (Array.isArray(value)) {
    const urls = value.filter(isUrl);
    if (urls.length > 0 && urls.length === value.length) {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {urls.map((u) =>
            isImageUrl(u) ? (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover border" />
              </a>
            ) : (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-primary underline break-all">{u}</a>
            ),
          )}
        </div>
      );
    }
    return <span>{value.join(", ")}</span>;
  }
  if (isUrl(value)) {
    return <a href={value} target="_blank" rel="noreferrer" className="text-primary underline break-all">{value}</a>;
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

/** Shows every answer the customer gave when ordering (order_details jsonb). Renders nothing when empty. */
export function OrderDetailsList({ details, title = "Full brief" }: { details: Record<string, unknown> | null | undefined; title?: string }) {
  const entries = Object.entries(details ?? {}).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-x-4 gap-y-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{humanize(key)}</dt>
              <dd><Value value={value} /></dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
