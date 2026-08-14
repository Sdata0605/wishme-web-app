import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MarketingHeader } from "./MarketingHeader";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

export type SuperAppNav =
  | "home"
  | "bills"
  | "travel"
  | "passbook"
  | "services"
  | "rewards"
  | "wallet"
  | "scan"
  | "greetings";

const headerActive: Record<SuperAppNav, string> = {
  home: "Home",
  bills: "Bills",
  travel: "Travel",
  passbook: "Passbook",
  services: "Services",
  rewards: "Rewards",
  wallet: "Wallet",
  scan: "Wallet",
  greetings: "Services",
};

type Props = {
  children: ReactNode;
  nav?: SuperAppNav;
  className?: string;
  contentClassName?: string;
  showFooter?: boolean;
  dark?: boolean;
};

export function SuperAppDesktopLayout({
  children,
  nav = "home",
  className,
  contentClassName,
  showFooter = true,
  dark = false,
}: Props) {
  const bottomVariant =
    nav === "bills" || nav === "travel" || nav === "passbook" || nav === "services"
      ? nav
      : "home";

  return (
    <div
      className={cn(
        "min-h-screen",
        dark ? "bg-[#0c1222] text-white" : "bg-[#f3f4f6] text-slate-900",
        className
      )}
    >
      <MarketingHeader active={headerActive[nav]} showWallet />

      <main
        className={cn(
          "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
          "pb-24 lg:pb-8",
          contentClassName
        )}
      >
        {children}
      </main>

      {showFooter && (
        <footer
          className={cn(
            "border-t",
            dark ? "border-white/10 bg-[#080b14]" : "border-slate-200 bg-white"
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className={cn("font-semibold", dark ? "text-white" : "text-slate-800")}>
              Wish<span className="text-[#ff5c00]">Me</span>
              <span className={cn("ml-2 font-normal", dark ? "text-white/45" : "text-slate-500")}>
                WatchMyIndia
              </span>
            </p>
            <div className={cn("flex flex-wrap gap-4 text-xs", dark ? "text-white/50" : "text-slate-500")}>
              <Link to="/support" className="hover:text-[#ff5c00]">
                Support
              </Link>
              <Link to="/privacy-policy" className="hover:text-[#ff5c00]">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-[#ff5c00]">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      )}

      <div className="lg:hidden">
        <BottomNav variant={bottomVariant} />
      </div>
    </div>
  );
}
