import { ReactNode } from "react";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export function ServicesPageLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const inner = (
    <div className="container mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
  );

  if (user) {
    return <AuthenticatedLayout>{inner}</AuthenticatedLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className={isMobile ? "mobile-safe-bottom pt-[60px]" : "pt-[60px]"}>{inner}</div>
      <Footer />
      {isMobile ? <MobileBottomNav isSignedIn={false} /> : null}
    </div>
  );
}

export function ServicesPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
