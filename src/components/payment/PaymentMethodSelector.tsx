import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodSelectorProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
  onWalletPayment: () => Promise<void>;
  onRazorpayPayment: () => Promise<void>;
  title: string;
  description?: string;
}

export function PaymentMethodSelector({
  open,
  onClose,
  amount,
  walletBalance,
  onWalletPayment,
  onRazorpayPayment,
  title,
  description
}: PaymentMethodSelectorProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<'wallet' | 'razorpay' | null>(null);
  const hasSufficientBalance = walletBalance >= amount;

  const handleWalletPayment = async () => {
    if (!hasSufficientBalance) {
      toast({
        title: "Insufficient Balance",
        description: "Please add funds to your wallet or use Razorpay",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing('wallet');
      await onWalletPayment();
      onClose();
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process wallet payment",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRazorpayPayment = async () => {
    try {
      setProcessing('razorpay');
      await onRazorpayPayment();
      // Don't close here - Razorpay will close on success
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not initialize Razorpay",
        variant: "destructive"
      });
      setProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-3xl font-bold">₹{amount.toLocaleString()}</p>
          </div>

          {/* Wallet Balance */}
          <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
            <span className="text-sm text-muted-foreground">Wallet Balance</span>
            <span className="font-semibold">₹{walletBalance.toLocaleString()}</span>
          </div>

          {/* Payment Options */}
          <div className="grid grid-cols-2 gap-4">
            {/* Wallet Payment */}
            <Button
              variant={hasSufficientBalance ? "default" : "outline"}
              className="h-32 flex flex-col items-center justify-center relative"
              onClick={handleWalletPayment}
              disabled={!hasSufficientBalance || processing !== null}
            >
              {processing === 'wallet' ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Wallet className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Wallet</span>
                  <span className="text-xs mt-1">Pay ₹{amount}</span>
                  {!hasSufficientBalance && (
                    <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                      Insufficient
                    </Badge>
                  )}
                </>
              )}
            </Button>

            {/* Razorpay Payment */}
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center"
              onClick={handleRazorpayPayment}
              disabled={processing !== null}
            >
              {processing === 'razorpay' ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Razorpay</span>
                  <span className="text-xs mt-1">Pay ₹{amount}</span>
                </>
              )}
            </Button>
          </div>

          {!hasSufficientBalance && (
            <p className="text-sm text-center text-muted-foreground">
              Add funds to your wallet for faster checkout
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
