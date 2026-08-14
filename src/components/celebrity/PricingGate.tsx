import { ReactNode } from "react";

interface PricingGateProps {
  isAuthenticated: boolean;
  children: ReactNode;
  fallbackContent?: ReactNode;
}

export function PricingGate({ isAuthenticated, children, fallbackContent }: PricingGateProps) {
  if (!isAuthenticated) {
    return fallbackContent || (
      <div className="text-center py-3 px-4 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground font-medium">Sign up to view pricing</p>
      </div>
    );
  }

  return <>{children}</>;
}
