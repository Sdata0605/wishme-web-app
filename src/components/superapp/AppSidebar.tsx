import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const billLinks = [
  { label: "Categories", to: "/bills" },
  { label: "Pay a bill", to: "/bills/pay" },
  { label: "Recharge", to: "/recharge" },
  { label: "History", to: "/passbook" },
];

const walletLinks = [
  { label: "Overview", to: "/wallet" },
  { label: "Passbook", to: "/passbook" },
  { label: "Scan", to: "/scan" },
  { label: "Settings", to: "/settings" },
];

/** Section-only nav — no duplicate of the top bar services list */
export function AppSidebar({ section }: { section: "bills" | "wallet" }) {
  const { pathname } = useLocation();
  const links = section === "bills" ? billLinks : walletLinks;
  const title = section === "bills" ? "Bills" : "Wallet";

  return (
    <aside className="hidden w-44 shrink-0 lg:block">
      <nav className="sticky top-20 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label={title}>
        <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <ul className="space-y-0.5">
          {links.map((link) => {
            const isActive = pathname === link.to;
            return (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 text-sm font-medium",
                    isActive ? "bg-orange-50 text-[#ea580c]" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
