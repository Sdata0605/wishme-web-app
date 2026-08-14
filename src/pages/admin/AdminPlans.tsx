import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Star, Zap, Crown, Check } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  discount_percentage: number;
  features: string[];
  referral_commission_l1: number;
  referral_commission_l2: number;
  service_discount_percentage: number;
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
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

  const updatePlan = async (planId: string, updates: Partial<Plan>) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;

      await fetchPlans();
      toast({
        title: "Success",
        description: "Plan updated successfully"
      });
      setEditDialogOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update plan",
        variant: "destructive"
      });
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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Plan Management</h1>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Plan Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage subscription plans, pricing, and features.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = getIcon(plan.name);
          
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
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingPlan(plan);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update plan pricing, features, and commission rates
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="originalPrice">Original Price (₹)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    value={editingPlan.original_price || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, original_price: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceDiscount">Service Discount (%)</Label>
                  <Input
                    id="serviceDiscount"
                    type="number"
                    value={editingPlan.service_discount_percentage}
                    onChange={(e) => setEditingPlan({ ...editingPlan, service_discount_percentage: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission1">Level 1 Commission (%)</Label>
                  <Input
                    id="commission1"
                    type="number"
                    value={editingPlan.referral_commission_l1}
                    onChange={(e) => setEditingPlan({ ...editingPlan, referral_commission_l1: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="commission2">Level 2 Commission (%)</Label>
                  <Input
                    id="commission2"
                    type="number"
                    value={editingPlan.referral_commission_l2}
                    onChange={(e) => setEditingPlan({ ...editingPlan, referral_commission_l2: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <textarea
                  id="features"
                  className="w-full h-32 p-2 border rounded-md resize-none"
                  value={editingPlan.features.join('\n')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(f => f.trim()) })}
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_popular}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })}
                  />
                  <span>Popular Plan</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updatePlan(editingPlan.id, editingPlan)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}