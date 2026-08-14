import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PaymentInstructionModalProps {
  open: boolean;
  onClose: () => void;
  onProceedWithRazorpay: () => void;
  onProceedWithWallet: () => void;
  celebrityName: string;
  occasionType: string;
  deliveryMethod: string;
  price: number;
  walletBalance?: number;
}

export const PaymentInstructionModal = ({
  open,
  onClose,
  onProceedWithRazorpay,
  onProceedWithWallet,
  celebrityName,
  occasionType,
  deliveryMethod,
  price,
  walletBalance = 0
}: PaymentInstructionModalProps) => {
  const hasEnoughBalance = walletBalance >= price;

  const getDeliveryDescription = () => {
    switch (deliveryMethod) {
      case 'ai':
        return 'AI will generate a personalized greeting card with your message';
      case 'upload-card':
        return 'Your uploaded card will be sent';
      case 'upload-video':
        return 'Your uploaded video will be sent';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Your Wish Payment</DialogTitle>
          <DialogDescription className="text-base">
            Review your order details before payment. Please ensure your content is respectful and complies with our acceptable use policy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Celebrity:</span>
              <span className="font-semibold">{celebrityName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Occasion:</span>
              <span className="font-medium">{occasionType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Method:</span>
              <span className="font-medium capitalize">{deliveryMethod === 'ai' ? 'AI Generated Card' : deliveryMethod.replace('-', ' ')}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">₹{price}</span>
          </div>

          {walletBalance > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Wallet Balance:</span>
                <span className={`font-semibold ${hasEnoughBalance ? 'text-green-600' : 'text-orange-600'}`}>
                  ₹{walletBalance}
                </span>
              </div>
            </>
          )}

          <Separator />

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              What happens after payment?
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
              <li>{getDeliveryDescription()}</li>
              <li>You'll receive a thank you message from {celebrityName} in your inbox</li>
              <li>The celebrity will see your wish and message</li>
              <li>You can view the card in your messages</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {hasEnoughBalance && (
            <Button
              onClick={onProceedWithWallet}
              className="w-full"
              size="lg"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pay with Wallet (₹{walletBalance})
            </Button>
          )}
          <Button
            onClick={onProceedWithRazorpay}
            variant={hasEnoughBalance ? "outline" : "default"}
            className="w-full"
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pay with Card/UPI
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
