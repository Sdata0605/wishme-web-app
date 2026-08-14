import { Link, useLocation } from "react-router-dom";
import { Clock3, Compass, FileText, Grid2X2, Home, QrCode, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type NavVariant = "home" | "bills" | "travel" | "passbook" | "services";

const configs: Record<
  NavVariant,
  { to: string; label: string; icon: typeof Home; center?: boolean }[]
> = {
  home: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/all-services", label: "Services", icon: Grid2X2 },
    { to: "/scan", label: "Scan", icon: QrCode, center: true },
    { to: "/passbook", label: "Activity", icon: FileText },
    { to: "/profile", label: "Profile", icon: User },
  ],
  bills: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/scan", label: "Pay", icon: QrCode, center: true },
    { to: "/bills", label: "Bills", icon: FileText },
    { to: "/profile", label: "Profile", icon: User },
  ],
  travel: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/travel", label: "Travel", icon: Compass, center: true },
    { to: "/passbook", label: "Bookings", icon: FileText },
    { to: "/all-services", label: "More", icon: Grid2X2 },
  ],
  passbook: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/scan", label: "Scan", icon: QrCode, center: true },
    { to: "/passbook", label: "Passbook", icon: Clock3 },
    { to: "/profile", label: "Profile", icon: User },
  ],
  services: [
    { to: "/app", label: "Home", icon: Home },
    { to: "/all-services", label: "Services", icon: Grid2X2 },
    { to: "/scan", label: "Scan", icon: QrCode, center: true },
    { to: "/passbook", label: "Activity", icon: FileText },
    { to: "/profile", label: "Profile", icon: User },
  ],
};

/** Mobile-only. Hidden from lg via parent. */
export function BottomNav({ variant = "home" }: { variant?: NavVariant }) {
  const { pathname } = useLocation();
  const items = configs[variant];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur"
      aria-label="Mobile"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
          const Icon = item.icon;
          if (item.center) {
            return (
              <li key={item.to} className="flex justify-center">
                <Link to={item.to} className="-mt-4 flex flex-col items-center gap-0.5" aria-label={item.label}>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff5c00] text-white shadow-md ring-4 ring-white">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className={cn("text-[10px] font-medium", active ? "text-[#ea580c]" : "text-slate-500")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium",
                  active ? "text-[#ea580c]" : "text-slate-500"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
