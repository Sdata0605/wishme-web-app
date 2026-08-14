import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Banknote,
  Bus,
  ChevronRight,
  CreditCard,
  Droplets,
  Flame,
  Gift,
  Heart,
  Hotel,
  Image,
  Landmark,
  LayoutGrid,
  Music,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  Video,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ServicesPageLayout } from "@/components/layout/ServicesPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Wishes", "Bills", "Recharge", "Travel", "Wallet"] as const;

type SubService = { label: string; icon: LucideIcon; href: string };

type CategoryCard = {
  title: string;
  desc: string;
  href: string;
  filter: (typeof FILTERS)[number];
  badge?: string;
  icon: LucideIcon;
  accent: "primary" | "accent";
  subs: SubService[];
};

const CATEGORIES: CategoryCard[] = [
  {
    title: "Wishes",
    desc: "Celebrity videos, AI greetings & photo wishes",
    href: "/celebrities",
    filter: "Wishes",
    icon: Heart,
    accent: "primary",
    subs: [
      { label: "Celebrity Wishes", icon: Heart, href: "/celebrities" },
      { label: "AI Greetings", icon: Sparkles, href: "/ai-greetings" },
      { label: "Video Wishes", icon: Video, href: "/celebrities" },
    ],
  },
  {
    title: "Travel",
    desc: "Flights, buses and hotels in one place",
    href: "/travel",
    filter: "Travel",
    icon: Plane,
    accent: "accent",
    subs: [
      { label: "Flights", icon: Plane, href: "/travel/flights" },
      { label: "Bus Tickets", icon: Bus, href: "/travel/bus" },
      { label: "Hotels", icon: Hotel, href: "/travel/hotels" },
    ],
  },
  {
    title: "Bills",
    desc: "Electricity, water & gas in a few taps",
    href: "/bills",
    filter: "Bills",
    icon: Zap,
    accent: "primary",
    subs: [
      { label: "Electricity", icon: Zap, href: "/bills/pay?category=electricity" },
      { label: "Water", icon: Droplets, href: "/bills/pay?category=water" },
      { label: "Gas", icon: Flame, href: "/bills/pay?category=gas" },
    ],
  },
  {
    title: "Recharge",
    desc: "Mobile, DTH and FASTag top-ups",
    href: "/recharge",
    filter: "Recharge",
    icon: Smartphone,
    accent: "primary",
    subs: [
      { label: "Mobile", icon: Smartphone, href: "/recharge" },
      { label: "DTH", icon: Tv, href: "/recharge" },
      { label: "FASTag", icon: CreditCard, href: "/recharge" },
    ],
  },
  {
    title: "Wallet",
    desc: "Add money, track spends & rewards",
    href: "/wallet",
    filter: "Wallet",
    icon: Wallet,
    accent: "accent",
    subs: [
      { label: "Add Money", icon: Plus, href: "/wallet" },
      { label: "Passbook", icon: Landmark, href: "/wallet" },
      { label: "Rewards", icon: Gift, href: "/rewards" },
    ],
  },
  {
    title: "Financial services",
    desc: "Loans, cards & insurance",
    href: "/bills",
    filter: "Bills",
    icon: Landmark,
    accent: "accent",
    subs: [
      { label: "Loan EMI", icon: Banknote, href: "/bills" },
      { label: "Credit Card", icon: CreditCard, href: "/bills" },
      { label: "Insurance", icon: ShieldCheck, href: "/bills" },
    ],
  },
  {
    title: "AI Studio",
    desc: "Create unique content with AI",
    href: "/ai-greetings",
    filter: "Wishes",
    badge: "New",
    icon: Sparkles,
    accent: "accent",
    subs: [
      { label: "AI Greetings", icon: Sparkles, href: "/ai-greetings" },
      { label: "AI Images", icon: Image, href: "/photo-wish" },
      { label: "AI Music", icon: Music, href: "/music-studio" },
    ],
  },
  {
    title: "Rewards",
    desc: "Earn points & exciting offers",
    href: "/rewards",
    filter: "Wallet",
    icon: Gift,
    accent: "primary",
    subs: [
      { label: "My Points", icon: Gift, href: "/rewards" },
      { label: "Redeem", icon: Gift, href: "/rewards" },
      { label: "Offers", icon: Sparkles, href: "/rewards" },
    ],
  },
];

export default function AllServices() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [openTitle, setOpenTitle] = useState<string | null>("Travel");

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((c) => {
      const byFilter = filter === "All" || c.filter === filter;
      const byQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.subs.some((s) => s.label.toLowerCase().includes(q));
      return byFilter && byQuery;
    });
  }, [query, filter]);

  return (
    <ServicesPageLayout>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-white shadow-glow sm:p-8">
        <LayoutGrid className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">Wish Me Super App</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">All Services</h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Wishes, bills, wallet and travel — pick a category, then continue into the same booking flow as the app.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="hero"
            className="rounded-full"
            onClick={() => navigate("/travel/flights")}
          >
            <Plane className="h-4 w-4" /> Book flights
          </Button>
          <Button
            variant="hero"
            className="rounded-full"
            onClick={() => navigate("/travel/hotels")}
          >
            <Hotel className="h-4 w-4" /> Book hotels
          </Button>
          <Button
            variant="hero"
            className="rounded-full"
            onClick={() => navigate("/travel/bus")}
          >
            <Bus className="h-4 w-4" /> Book buses
          </Button>
          <Button
            variant="hero"
            className="rounded-full"
            onClick={() => navigate("/travel/trips")}
          >
            My Trips
          </Button>
          <Button
            variant="hero"
            className="rounded-full"
            onClick={() => navigate("/celebrities")}
          >
            <Heart className="h-4 w-4" /> Book a wish
          </Button>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden rounded-2xl border-border">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Travel</p>
              <h2 className="mt-0.5 text-lg font-semibold text-foreground">Flight booking</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search → fares → travellers → review. Sample fares for demo, Wish Me checkout style.
              </p>
            </div>
          </div>
          <Button className="rounded-full" onClick={() => navigate("/travel/flights")}>
            Search flights
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-border">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Hotel className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Stay</p>
                <h2 className="mt-0.5 text-lg font-semibold text-foreground">Hotel booking</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  City → rooms → guests → pay now / pay at hotel. Sample stays for demo.
                </p>
              </div>
            </div>
            <Button className="rounded-full" onClick={() => navigate("/travel/hotels")}>
              Search hotels
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-2xl border-border">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bus className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Road</p>
                <h2 className="mt-0.5 text-lg font-semibold text-foreground">Bus tickets</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search → seats → boarding points → passenger → pay. Sample inventory.
                </p>
              </div>
            </div>
            <Button className="rounded-full" onClick={() => navigate("/travel/bus")}>
              Search buses
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, bills, offers, celebrities…"
            className="h-11 rounded-xl pl-9"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === item
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const open = openTitle === card.title;
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={cn(
                "overflow-hidden rounded-2xl border-border transition-shadow hover:shadow-card",
                open && "ring-1 ring-primary/30"
              )}
            >
              <CardContent className="p-5">
                <button
                  type="button"
                  onClick={() => setOpenTitle(open ? null : card.title)}
                  className="flex w-full items-start gap-4 text-left"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      card.accent === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{card.title}</h3>
                      {card.badge ? (
                        <Badge className="bg-gradient-primary text-[10px] uppercase text-white">{card.badge}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                  <ChevronRight className={cn("mt-1 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                </button>

                {open ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {card.subs.map((sub) => (
                      <Link
                        key={sub.label}
                        to={sub.href}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 px-2 py-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <sub.icon className="h-4 w-4 text-primary" />
                        <span className="text-[11px] font-medium text-foreground">{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                <Link
                  to={card.href}
                  className="mt-4 inline-flex items-center text-xs font-semibold text-primary hover:underline"
                >
                  Open {card.title.toLowerCase()}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <Card className="mt-4 rounded-2xl">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No services match “{query}”.
          </CardContent>
        </Card>
      ) : null}
    </ServicesPageLayout>
  );
}
