import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star, Zap, Crown, CheckCircle, Loader2, Gift } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  discount_percentage: number;
  features: any[];
  referral_commission_l1: number;
  referral_commission_l2: number;
  service_discount_percentage: number;
  is_popular: boolean;
}

export default function Plan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const wasRedirected = searchParams.get('redirected') === 'true';
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchPlans();
  }, [user, authLoading]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      setPlans((data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string || '[]')
      })));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planName: string) => {
    setSelecting(planName);
    
    try {
      const { error } = await updateProfile({ plan: planName as 'basic' | 'premium' | 'elite' });
      
      if (!error) {
        toast({
          title: "Welcome to WishMe! 🎉",
          description: `Your ${planName} plan is now active. Enjoy all features!`
        });
        sessionStorage.removeItem('plan_skipped_this_session');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update plan",
        variant: "destructive"
      });
    } finally {
      setSelecting(null);
    }
  };

  const getIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'basic': return Star;
      case 'premium': return Zap;
      case 'elite': return Crown;
      default: return Star;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Filter plans based on current user plan
  const availablePlans = profile ? plans.filter(plan => {
    if (profile.plan === 'basic') return true;
    if (profile.plan === 'premium') return ['premium', 'elite'].includes(plan.name);
    if (profile.plan === 'elite') return plan.name === 'elite';
    return true;
  }) : plans;

  const isCurrentPlan = (planName: string) => profile?.plan === planName;
  const isHighestPlan = profile?.plan === 'elite';

  return (
    <AuthenticatedLayout showSidebar={!!user}>
      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-foreground">Choose Your </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">Perfect Plan</span>
            </h1>
            {wasRedirected && !isHighestPlan && (
              <p className="text-lg text-primary font-medium mb-2">
                Welcome to WishMe! Choose a plan to unlock all features.
              </p>
            )}
            {isHighestPlan ? (
              <p className="text-xl text-muted-foreground">
                🎉 Congratulations! You're already on our highest plan.
              </p>
            ) : (
              <p className="text-xl text-muted-foreground">
                {profile ? 'Upgrade your plan to unlock more features and better rates' : 'Select a plan to get started with Wish Me'}
              </p>
            )}
            <Button
              onClick={() => navigate('/referrals')}
              variant="outline"
              className="mt-4 gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Gift className="w-4 h-4" />
              Refer &amp; Earn
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {availablePlans.map((plan) => {
              const Icon = getIcon(plan.name);
              const isCurrent = isCurrentPlan(plan.name);
              
              return (
                <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                  {plan.is_popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl capitalize">{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.name === 'basic' ? 'Perfect for getting started' :
                       plan.name === 'premium' ? 'Most popular choice' :
                       'Maximum earning potential'}
                    </CardDescription>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-4xl font-bold text-primary">₹{plan.price}</span>
                        {plan.original_price && plan.original_price !== plan.price && (
                          <span className="text-lg text-muted-foreground line-through">₹{plan.original_price}</span>
                        )}
                      </div>
                      {plan.service_discount_percentage > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {plan.service_discount_percentage}% Service Discount
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Referral Details */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-2 text-primary">Referral Benefits</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Level 1:</span>
                          <span className="font-medium">{plan.referral_commission_l1}%</span>
                        </div>
                        {plan.referral_commission_l2 > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Level 2:</span>
                            <span className="font-medium">{plan.referral_commission_l2}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Service Discount:</span>
                          <span className="font-medium">{plan.service_discount_percentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-primary">Features</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan.name)}
                      disabled={isCurrent || selecting === plan.name}
                      className={`w-full h-12 text-base ${
                        plan.is_popular ? 'bg-gradient-primary hover:bg-primary-dark' : ''
                      }`}
                      variant={plan.is_popular ? "default" : "outline"}
                    >
                      {selecting === plan.name ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : (
                        `Select ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Maybe Later link for basic users */}
          {wasRedirected && !isHighestPlan && profile?.plan === 'basic' && (
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  sessionStorage.setItem('plan_skipped_this_session', 'true');
                  navigate('/dashboard');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}