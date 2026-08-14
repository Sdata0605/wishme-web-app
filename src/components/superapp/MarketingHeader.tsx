import { Link, useLocation } from "react-router-dom";
import { Bell, Menu, Wallet, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/wish-me-logo.png";

const marketingLinks = [
  { label: "Home", to: "/" },
  { label: "Wishes", to: "/celebrities" },
  { label: "Services", to: "/all-services" },
  { label: "Bills", to: "/bills" },
  { label: "Travel", to: "/travel" },
  { label: "Support", to: "/support" },
];

/** Keep desktop nav short — Scan/Recharge/Greetings live under Services or page CTAs */
const appLinks = [
  { label: "Home", to: "/app" },
  { label: "Bills", to: "/bills" },
  { label: "Travel", to: "/travel" },
  { label: "Wallet", to: "/wallet" },
  { label: "Passbook", to: "/passbook" },
  { label: "Services", to: "/all-services" },
  { label: "Rewards", to: "/rewards" },
];

export function MarketingHeader({
  active = "Home",
  showWallet = false,
}: {
  active?: string;
  showWallet?: boolean;
}) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = showWallet ? appLinks : marketingLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0b1220] text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to={showWallet ? "/app" : "/"} className="flex items-center gap-2">
            <img src={logo} alt="WishMe" className="h-8 w-8 rounded-md object-contain" />
            <span className="text-lg font-semibold tracking-tight">
              Wish<span className="text-[#ff5c00]">Me</span>
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const isActive =
              active === link.label ||
              pathname === link.to ||
              (link.to !== "/" && link.to !== "/app" && pathname.startsWith(link.to));
            return (
              <Link
                key={`${link.label}-${link.to}`}
                to={link.to}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {showWallet ? (
            <>
              <Link
                to="/wallet"
                className="hidden items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium sm:inline-flex hover:bg-white/5"
              >
                <Wallet className="h-3.5 w-3.5 text-[#ff5c00]" />
                ₹2,450.75
              </Link>
              <button
                type="button"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>
              <Link
                to="/profile"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#6d28d9] text-sm font-semibold"
                aria-label="Profile"
              >
                M
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium sm:inline-flex hover:bg-white/5"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                className="rounded-md bg-[#ff5c00] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#ea580c]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0b1220] px-4 py-3 lg:hidden">
          <nav className="mx-auto grid max-w-6xl gap-1" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={`m-${link.label}-${link.to}`}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  active === link.label || pathname === link.to
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
            {showWallet ? (
              <>
                <Link
                  to="/recharge"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5"
                >
                  Recharge
                </Link>
                <Link
                  to="/scan"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5"
                >
                  Scan
                </Link>
                <Link
                  to="/ai-greetings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5"
                >
                  Greetings
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
