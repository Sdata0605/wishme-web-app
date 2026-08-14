import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Video, ImageIcon, CheckCircle } from "lucide-react";

interface DeliveryTypeStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
}

export function DeliveryTypeStep({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  celebrity
}: DeliveryTypeStepProps) {
  const [deliveryType, setDeliveryType] = useState(bookingData.deliveryType || 'video');

  const getServicePrice = () => {
    const serviceType = bookingData.serviceType;
    switch (serviceType) {
      case 'wish': return celebrity?.service_prices?.general_wish || 5000;
      case 'ad': return celebrity?.service_prices?.image_promotion || 25000;
      case 'video': return celebrity?.service_prices?.video_promotion || 50000;
      default: return celebrity?.service_prices?.general_wish || 5000;
    }
  };

  const servicePrice = getServicePrice();

  const deliveryOptions = [
    {
      value: 'video',
      title: 'Video Message',
      description: 'Personalized AI-generated video from the celebrity',
      icon: Video,
      price: servicePrice
    },
    {
      value: 'card',
      title: 'Greeting Card',
      description: 'Beautiful AI-generated greeting card',
      icon: ImageIcon,
      price: servicePrice
    },
    {
      value: 'both',
      title: 'Video + Card',
      description: 'Get both video message and greeting card',
      icon: CheckCircle,
      price: servicePrice
    }
  ];

  const handleNext = () => {
    updateBookingData({ deliveryType });
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Delivery Type</CardTitle>
        <CardDescription>
          Select how you want to receive your personalized message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={deliveryType} onValueChange={setDeliveryType}>
          <div className="space-y-4">
            {deliveryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex items-start gap-4 rounded-lg border-2 border-muted p-4 cursor-pointer transition-all hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{option.title}</h4>
                        <span className="text-lg font-bold text-primary">
                          ₹{option.price.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
