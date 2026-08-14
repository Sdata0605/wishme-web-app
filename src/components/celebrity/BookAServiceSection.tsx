import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ImageIcon, Video, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookAServiceSectionProps {
  celebrity: any;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

export function BookAServiceSection({ celebrity, isSubscribed, onSubscribe }: BookAServiceSectionProps) {
  const navigate = useNavigate();

  const services = [
    {
      id: 'wish',
      title: 'Wish a Friend',
      description: 'Personalized video message for your loved ones',
      icon: Heart,
      price: celebrity?.service_prices?.general_wish || 5000,
      color: 'text-pink-600'
    },
    {
      id: 'ad',
      title: 'Make an Ad',
      description: 'Professional image promotion for your brand',
      icon: ImageIcon,
      price: celebrity?.service_prices?.image_promotion || 25000,
      color: 'text-blue-600'
    },
    {
      id: 'video',
      title: 'Make a Video Promo',
      description: 'High-quality video promotional content',
      icon: Video,
      price: celebrity?.service_prices?.video_promotion || 50000,
      color: 'text-purple-600'
    }
  ];

  const handleBookNow = (serviceId: string) => {
    if (!isSubscribed) {
      onSubscribe();
      return;
    }
    navigate(`/booking/${celebrity.id}?service=${serviceId}`);
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Book a Service</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 ${service.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  {isSubscribed ? (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary mb-1">₹{service.price.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-xs">{celebrity?.delivery_time || '24 hours'}</Badge>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Subscribe to view</p>
                    </div>
                  )}
                  <Button 
                    onClick={() => handleBookNow(service.id)}
                    className="w-full"
                    variant={isSubscribed ? "default" : "outline"}
                  >
                    {isSubscribed ? 'Book Now' : 'Subscribe to Book'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
