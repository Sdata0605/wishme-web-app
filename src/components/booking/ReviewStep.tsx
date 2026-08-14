import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, BadgePercent } from "lucide-react";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";

interface ReviewStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
  serviceType: string;
  currentStep: number;
  totalSteps: number;
}

export function ReviewStep({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  celebrity,
  serviceType,
  currentStep,
  totalSteps
}: ReviewStepProps) {
  const { discountPercentage, planName, getDiscountedPrice, getSavingsAmount } = usePlanDiscount();

  const getServiceTitle = () => {
    switch (serviceType) {
      case 'wish':
        return 'Wish a Friend';
      case 'ad':
        return 'Make an Ad';
      case 'video':
        return 'Make a Video Promo';
      default:
        return 'Service';
    }
  };

  const getServicePrice = () => {
    switch (serviceType) {
      case 'wish':
        return celebrity.service_prices?.general_wish || 0;
      case 'ad':
        return celebrity.service_prices?.image_promotion || 0;
      case 'video':
        return celebrity.service_prices?.video_promotion || 0;
      default:
        return 0;
    }
  };

  const basePrice = getServicePrice();
  const discountedServicePrice = getDiscountedPrice(basePrice);
  const serviceFee = Math.round(discountedServicePrice * 0.1);
  const totalAmount = discountedServicePrice + serviceFee;
  const savingsAmount = getSavingsAmount(basePrice);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review your request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Discount Notice - Same as CheckoutStep */}
        {discountPercentage > 0 && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <BadgePercent className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              🎉 <strong>{discountPercentage}% {planName?.toUpperCase()} Plan Discount Applied!</strong> You save ₹{savingsAmount.toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Request Details */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Request details</h3>
            <Button variant="ghost" size="sm" onClick={() => {
              // Navigate back to step 1 (Request Details)
              updateBookingData({ _goToStep: 1 });
              onPrev(); onPrev(); onPrev(); onPrev();
            }}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {serviceType === 'video' && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bookingData.requestDetails?.businessName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {bookingData.requestDetails?.videoType === 'marketing' ? 'Marketing' : 'Business event'}
                  </span>
                </div>
                {bookingData.requestDetails?.businessPronunciation && (
                  <p className="text-sm text-muted-foreground">
                    Pronunciation: {bookingData.requestDetails.businessPronunciation}
                  </p>
                )}
              </>
            )}
            
            {serviceType === 'wish' && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bookingData.requestDetails?.recipientName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {bookingData.requestDetails?.occasion}
                  </span>
                </div>
                {bookingData.requestDetails?.recipientRelation && (
                  <p className="text-sm text-muted-foreground">
                    Relationship: {bookingData.requestDetails.recipientRelation}
                  </p>
                )}
                {bookingData.requestDetails?.message && (
                  <p className="text-sm">
                    Message: {bookingData.requestDetails.message}
                  </p>
                )}
              </>
            )}
            
            {serviceType === 'ad' && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bookingData.requestDetails?.businessName}</Badge>
                </div>
                {bookingData.requestDetails?.message && (
                  <p className="text-sm">
                    Description: {bookingData.requestDetails.message}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Creative Guidelines */}
        {bookingData.creativeGuidelines?.goal && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Creative guidelines</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Goal:</p>
                <p className="text-sm text-muted-foreground">{bookingData.creativeGuidelines.goal}</p>
              </div>
              {bookingData.creativeGuidelines.toneAndStyle && (
                <div>
                  <p className="text-sm font-medium">Tone & Style:</p>
                  <p className="text-sm text-muted-foreground">{bookingData.creativeGuidelines.toneAndStyle}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Script/Content */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">
            {serviceType === 'ad' ? 'Ad Creative' : 'Script'}
          </h3>
          <div className="space-y-2">
            {serviceType === 'ad' ? (
              <>
                <div>
                  <p className="text-sm font-medium">Description:</p>
                  <p className="text-sm text-muted-foreground">{bookingData.scriptBuilder?.talkingPoints}</p>
                </div>
                {bookingData.scriptBuilder?.requiredLines && (
                  <div>
                    <p className="text-sm font-medium">Style preferences:</p>
                    <p className="text-sm text-muted-foreground">{bookingData.scriptBuilder.requiredLines}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium">
                    {bookingData.scriptBuilder?.scriptType === 'talking_points' ? 'Talking Points:' : 'Exact Script:'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bookingData.scriptBuilder?.scriptType === 'talking_points' 
                      ? bookingData.scriptBuilder.talkingPoints 
                      : bookingData.scriptBuilder.exactScript}
                  </p>
                </div>
                {bookingData.scriptBuilder?.requiredLines && (
                  <div>
                    <p className="text-sm font-medium">Required lines:</p>
                    <p className="text-sm text-muted-foreground">{bookingData.scriptBuilder.requiredLines}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pricing Summary - Now uses discounted prices matching CheckoutStep */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h3 className="font-semibold mb-3">Pricing Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{getServiceTitle()}</span>
              {discountPercentage > 0 ? (
                <div className="text-right">
                  <span className="line-through text-muted-foreground text-sm mr-2">₹{basePrice.toLocaleString()}</span>
                  <span className="text-green-600 font-medium">₹{discountedServicePrice.toLocaleString()}</span>
                </div>
              ) : (
                <span>₹{basePrice.toLocaleString()}</span>
              )}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Platform Fee (10%)</span>
              <span>₹{serviceFee.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button onClick={onNext}>
            Checkout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}