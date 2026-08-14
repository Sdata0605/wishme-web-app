import { Badge } from "@/components/ui/badge";
import { BadgePercent, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface DiscountBadgeProps {
  basePrice: number;
  discountedPrice: number;
  discountPercentage: number;
  planName?: string | null;
  showUpgradeLink?: boolean;
  className?: string;
}

export function DiscountBadge({
  basePrice,
  discountedPrice,
  discountPercentage,
  planName,
  showUpgradeLink = true,
  className = ""
}: DiscountBadgeProps) {
  if (discountPercentage <= 0) {
    if (!showUpgradeLink) return null;
    
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Sparkles className="h-4 w-4" />
        <span>
          <Link to="/plan" className="text-primary hover:underline font-medium">
            Upgrade your plan
          </Link>
          {" "}for service discounts
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <BadgePercent className="h-3 w-3 mr-1" />
          {discountPercentage}% {planName ? `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan` : ''} Discount
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="line-through text-muted-foreground">₹{basePrice.toLocaleString()}</span>
        <span className="font-semibold text-lg text-primary">₹{discountedPrice.toLocaleString()}</span>
        <span className="text-green-600 text-xs font-medium">
          (Save ₹{(basePrice - discountedPrice).toLocaleString()})
        </span>
      </div>
    </div>
  );
}

interface PricingDisplayProps {
  basePrice: number;
  discountedPrice: number;
  discountPercentage: number;
  planName?: string | null;
  label?: string;
  showUpgradeLink?: boolean;
}

export function PricingDisplay({
  basePrice,
  discountedPrice,
  discountPercentage,
  planName,
  label = "Price",
  showUpgradeLink = true
}: PricingDisplayProps) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      {discountPercentage > 0 ? (
        <DiscountBadge
          basePrice={basePrice}
          discountedPrice={discountedPrice}
          discountPercentage={discountPercentage}
          planName={planName}
          showUpgradeLink={false}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold">₹{basePrice.toLocaleString()}</p>
          {showUpgradeLink && (
            <p className="text-xs text-muted-foreground">
              <Link to="/plan" className="text-primary hover:underline">
                Upgrade your plan
              </Link>
              {" "}to get up to 15% off
            </p>
          )}
        </div>
      )}
    </div>
  );
}
