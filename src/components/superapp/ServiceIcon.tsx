import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServiceIcon({
  label,
  icon: Icon,
  accent,
  bg,
  href,
  size = "md",
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  href: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const box = size === "sm" ? "h-10 w-10" : size === "lg" || size === "xl" ? "h-12 w-12" : "h-11 w-11";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Link
      to={href}
      className="group flex flex-col items-center gap-1.5 rounded-lg p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#ff5c00]/50"
    >
      <span className={cn("grid place-items-center rounded-xl border border-transparent group-hover:border-slate-200", box, bg)}>
        <Icon className={cn(iconSize, accent)} strokeWidth={2} />
      </span>
      <span className="max-w-[5.5rem] text-[11px] font-medium leading-snug text-slate-700">{label}</span>
    </Link>
  );
}

export function SectionHeader({
  title,
  actionLabel = "View all",
  actionHref = "/all-services",
  showAction = true,
  className,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  showAction?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {showAction && actionHref ? (
        <Link to={actionHref} className="text-sm font-medium text-[#ea580c] hover:underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StatusChip({ status }: { status: "Success" | "Pending" | "Refund" }) {
  const styles =
    status === "Success"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Refund"
        ? "bg-violet-50 text-violet-700"
        : "bg-amber-50 text-amber-800";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium", styles)}>
      {status}
    </span>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      {children}
    </section>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-slate-900")}>
          {title}
        </h1>
        {subtitle ? (
          <p className={cn("mt-1 text-sm", dark ? "text-white/55" : "text-slate-500")}>{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
