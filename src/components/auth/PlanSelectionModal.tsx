import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Star, Zap, Crown, CheckCircle, Loader2 } from "lucide-react";

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

interface PlanSelectionModalProps {
  open: boolean;
  onClose: () => void;
  canSkip?: boolean;
}

export function PlanSelectionModal({ open, onClose, canSkip = false }: PlanSelectionModalProps) {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

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
          title: "Plan Selected!",
          description: `You've successfully selected the ${planName} plan.`
        });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not select plan",
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

  return (
    <Dialog open={open} onOpenChange={canSkip ? onClose : undefined}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select a plan to unlock exclusive features and discounts
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {plans.map((plan) => {
              const Icon = getIcon(plan.name);
              
              return (
                <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary shadow-lg' : ''}`}>
                  {plan.is_popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {plan.name === 'basic' ? 'Perfect for getting started' :
                       plan.name === 'premium' ? 'Most popular choice' :
                       'Maximum earning potential'}
                    </CardDescription>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl font-bold text-primary">₹{plan.price}</span>
                        {plan.original_price && plan.original_price !== plan.price && (
                          <span className="text-sm text-muted-foreground line-through">₹{plan.original_price}</span>
                        )}
                      </div>
                      {plan.service_discount_percentage > 0 && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          {plan.service_discount_percentage}% Off Services
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Key Features */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Top Features</h4>
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2 text-xs">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan.name)}
                      disabled={selecting === plan.name}
                      className="w-full"
                      variant={plan.is_popular ? "default" : "outline"}
                    >
                      {selecting === plan.name ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        `Select ${plan.name}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {canSkip && (
          <div className="flex justify-center pt-2">
            <Button variant="ghost" onClick={onClose}>
              Skip for now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
