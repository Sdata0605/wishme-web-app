import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, TrendingUp, Users, DollarSign, Edit, Save, X, Plus } from "lucide-react";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
}

interface SubscriptionPricing {
  id: string;
  celebrity_id: string;
  price: number;
  celebrity_commission_percentage: number;
  referrer_commission_percentage: number;
  is_enabled: boolean;
  celebrities?: Celebrity;
}

interface SubscriptionMetrics {
  total_subscriptions: number;
  active_subscriptions: number;
  total_revenue: number;
  celebrity_commissions: number;
  referrer_commissions: number;
}

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<SubscriptionPricing[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form states
  const [selectedCelebrity, setSelectedCelebrity] = useState("");
  const [price, setPrice] = useState(999);
  const [celebrityCommission, setCelebrityCommission] = useState(5);
  const [referrerCommission, setReferrerCommission] = useState(10);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPricing(),
      fetchCelebrities(),
      fetchMetrics()
    ]);
    setLoading(false);
  };

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrity_favorite_pricing')
        .select(`
          *,
          celebrities (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPricing(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load subscription pricing",
        variant: "destructive"
      });
    }
  };

  const fetchCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, name, category, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrities",
        variant: "destructive"
      });
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: subscriptions, error } = await supabase
        .from('celebrity_favorites')
        .select('price_paid, celebrity_commission, referrer_commission, status');

      if (error) throw error;

      const metrics: SubscriptionMetrics = {
        total_subscriptions: subscriptions?.length || 0,
        active_subscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
        total_revenue: subscriptions?.reduce((sum, s) => sum + (s.price_paid || 0), 0) || 0,
        celebrity_commissions: subscriptions?.reduce((sum, s) => sum + (s.celebrity_commission || 0), 0) || 0,
        referrer_commissions: subscriptions?.reduce((sum, s) => sum + (s.referrer_commission || 0), 0) || 0,
      };

      setMetrics(metrics);
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleAddPricing = async () => {
    if (!selectedCelebrity) {
      toast({
        title: "Error",
        description: "Please select a celebrity",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('celebrity_favorite_pricing')
        .insert({
          celebrity_id: selectedCelebrity,
          price,
          celebrity_commission_percentage: celebrityCommission,
          referrer_commission_percentage: referrerCommission,
          is_enabled: isEnabled
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription pricing added successfully"
      });

      setShowAddDialog(false);
      resetForm();
      fetchPricing();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not add pricing",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePricing = async (id: string) => {
    const item = pricing.find(p => p.id === id);
    if (!item) return;

    try {
      const { error } = await supabase
        .from('celebrity_favorite_pricing')
        .update({
          price: item.price,
          celebrity_commission_percentage: item.celebrity_commission_percentage,
          referrer_commission_percentage: item.referrer_commission_percentage,
          is_enabled: item.is_enabled
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pricing updated successfully"
      });

      setEditingId(null);
      fetchPricing();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not update pricing",
        variant: "destructive"
      });
    }
  };

  const updateLocalPricing = (id: string, field: string, value: any) => {
    setPricing(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const resetForm = () => {
    setSelectedCelebrity("");
    setPrice(999);
    setCelebrityCommission(5);
    setReferrerCommission(10);
    setIsEnabled(true);
  };

  const availableCelebrities = celebrities.filter(c => 
    !pricing.some(p => p.celebrity_id === c.id)
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl md:text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">Manage celebrity subscription pricing and view metrics</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_subscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_subscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics?.total_revenue || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celebrity Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics?.celebrity_commissions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrer Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics?.referrer_commissions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Pricing</CardTitle>
              <CardDescription>Configure pricing for celebrity subscriptions</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pricing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subscription Pricing</DialogTitle>
                  <DialogDescription>Configure pricing for a new celebrity</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Celebrity</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={selectedCelebrity}
                      onChange={(e) => setSelectedCelebrity(e.target.value)}
                    >
                      <option value="">Select celebrity...</option>
                      {availableCelebrities.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Celebrity Commission (%)</Label>
                    <Input
                      type="number"
                      value={celebrityCommission}
                      onChange={(e) => setCelebrityCommission(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Referrer Commission (%)</Label>
                    <Input
                      type="number"
                      value={referrerCommission}
                      onChange={(e) => setReferrerCommission(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                    <Label>Enabled</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddPricing}>Add Pricing</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Celebrity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Celebrity %</TableHead>
                <TableHead>Referrer %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.celebrities?.name}</div>
                      <div className="text-sm text-muted-foreground">{item.celebrities?.category}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateLocalPricing(item.id, 'price', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                    ) : (
                      <span>₹{item.price}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        value={item.celebrity_commission_percentage}
                        onChange={(e) => updateLocalPricing(item.id, 'celebrity_commission_percentage', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <span>{item.celebrity_commission_percentage}%</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        value={item.referrer_commission_percentage}
                        onChange={(e) => updateLocalPricing(item.id, 'referrer_commission_percentage', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <span>{item.referrer_commission_percentage}%</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Switch
                        checked={item.is_enabled}
                        onCheckedChange={(checked) => updateLocalPricing(item.id, 'is_enabled', checked)}
                      />
                    ) : (
                      <Badge variant={item.is_enabled ? "default" : "secondary"}>
                        {item.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdatePricing(item.id)}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(item.id)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
