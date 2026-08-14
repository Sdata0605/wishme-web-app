import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RequestDetailsStep } from "@/components/booking/RequestDetailsStep";
import { DeliveryTypeStep } from "@/components/booking/DeliveryTypeStep";
import { CreativeGuidelinesStep } from "@/components/booking/CreativeGuidelinesStep";
import { ScriptBuilderStep } from "@/components/booking/ScriptBuilderStep";
import { ReviewStep } from "@/components/booking/ReviewStep";
import { CheckoutStep } from "@/components/booking/CheckoutStep";
import { usePlanDiscount } from "@/hooks/usePlanDiscount";
import { DiscountBadge } from "@/components/ui/discount-badge";
import { useCelebritySubscription } from "@/hooks/useCelebritySubscription";
import { ServiceGuide } from "@/components/ui/service-guide";
import { bookingWizardGuide } from "@/data/service-guides";

export default function Booking() {
  const { celebrityId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceType = searchParams.get('service');
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const { toast } = useToast();
  const { discountPercentage, planName, getDiscountedPrice } = usePlanDiscount();
  const { isSubscribed, loading: subLoading } = useCelebritySubscription(celebrityId);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [celebrity, setCelebrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    serviceType,
    requestDetails: {},
    deliveryType: serviceType === 'ad' ? 'card' : 'video',
    creativeGuidelines: {},
    scriptBuilder: {},
  });

  // Skip delivery type step for "Make an Ad" since it's always an image
  const steps = useMemo(() => {
    const allSteps = [
      { number: 1, title: "Request details", component: RequestDetailsStep },
      ...(serviceType !== 'ad' ? [{ number: 2, title: "Delivery type", component: DeliveryTypeStep }] : []),
      { number: serviceType !== 'ad' ? 3 : 2, title: "Creative guidelines", component: CreativeGuidelinesStep },
      { number: serviceType !== 'ad' ? 4 : 3, title: "Script builder", component: ScriptBuilderStep },
      { number: serviceType !== 'ad' ? 5 : 4, title: "Review", component: ReviewStep },
      { number: serviceType !== 'ad' ? 6 : 5, title: "Checkout", component: CheckoutStep },
    ];
    return allSteps;
  }, [serviceType]);

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // UGC ads have their own dedicated page - redirect there
    if (serviceType === 'ugc' && celebrityId) {
      navigate(`/ugc-ads?celebrity=${celebrityId}`, { replace: true });
      return;
    }

    // Validate subscription — redirect if not subscribed
    if (!isSubscribed && profile) {
      toast({
        title: "Subscription Required",
        description: "You need to subscribe to this celebrity before booking a service.",
        variant: "destructive"
      });
      navigate(`/celebrity/${celebrityId}`, { replace: true });
      return;
    }
    
    if (celebrityId) {
      fetchCelebrityData();
    }
  }, [celebrityId, user, serviceType, navigate, authLoading, isSubscribed, subLoading, profile]);

  const fetchCelebrityData = async () => {
    try {
      const { data: celebrityData, error } = await supabase
        .from('celebrities')
        .select('*')
        .eq('id', celebrityId)
        .single();

      if (error) throw error;
      setCelebrity(celebrityData);
    } catch (error) {
      console.error('Error fetching celebrity:', error);
      toast({
        title: "Error",
        description: "Could not load celebrity data",
        variant: "destructive"
      });
      navigate('/celebrities');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingData = (stepData: any) => {
    setBookingData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getServicePrice = () => {
    if (!celebrity) return 0;
    
    switch (serviceType) {
      case 'wish':
        return celebrity.service_prices?.general_wish || 0;
      case 'ad':
        return celebrity.service_prices?.image_promotion || 0;
      case 'video':
        return celebrity.service_prices?.video_promotion || 0;
      case 'ugc':
        return celebrity.service_prices?.ugc_ad || 25000;
      default:
        return 0;
    }
  };

  const getServiceTitle = () => {
    switch (serviceType) {
      case 'wish':
        return 'Wish a Friend';
      case 'ad':
        return 'Make an Ad';
      case 'video':
        return 'Make a Video Promo';
      case 'ugc':
        return 'UGC Video Ad';
      default:
        return 'Service';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Celebrity Not Found</h1>
          <p className="text-muted-foreground">The celebrity you're trying to book doesn't exist.</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-16 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content - 75% */}
            <div className="lg:w-3/4">
              <ServiceGuide {...bookingWizardGuide} className="mb-6" />

              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        currentStep >= step.number 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {currentStep > step.number ? '✓' : step.number}
                      </div>
                      <span className={`ml-2 text-sm ${
                        currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                      {index < steps.length - 1 && (
                        <div className="w-8 h-px bg-border mx-4" />
                      )}
                    </div>
                  ))}
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              {/* Current Step Content */}
              <CurrentStepComponent
                bookingData={bookingData}
                updateBookingData={updateBookingData}
                onNext={nextStep}
                onPrev={prevStep}
                celebrity={celebrity}
                serviceType={serviceType}
                currentStep={currentStep}
                totalSteps={steps.length}
              />
            </div>

            {/* Sidebar - 25% */}
            <div className="lg:w-1/4">
              <div className="sticky top-20">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        {celebrity.image_url ? (
                          <img 
                            src={celebrity.image_url} 
                            alt={`${celebrity.name} - Celebrity Profile`} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            ⭐
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{celebrity.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">⭐ {celebrity.rating || 0}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">{getServiceTitle()}</p>
                        <DiscountBadge
                          basePrice={getServicePrice()}
                          discountedPrice={getDiscountedPrice(getServicePrice())}
                          discountPercentage={discountPercentage}
                          planName={planName}
                        />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Service Fee</span>
                          <span>₹{Math.round(getDiscountedPrice(getServicePrice()) * 0.1).toLocaleString()}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span className="text-primary">₹{(getDiscountedPrice(getServicePrice()) + Math.round(getDiscountedPrice(getServicePrice()) * 0.1)).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}