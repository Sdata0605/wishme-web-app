import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Star, 
  Settings, 
  UserPlus, 
  Edit,
  BarChart3,
  Crown,
  Loader2,
  Shield,
  DollarSign,
  MapPin
} from "lucide-react";
import AdminLocations from "./admin/AdminLocations";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'user' | 'celebrity' | 'admin';
  plan: 'basic' | 'premium' | 'elite';
  is_active: boolean;
  referral_code?: string;
  created_at: string;
}

interface Celebrity {
  id: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  service_prices: any;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  discount_percentage: number;
  referral_commission_l1: number;
  referral_commission_l2: number;
  service_discount_percentage: number;
  is_popular: boolean;
  is_active: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCelebrity, setEditingCelebrity] = useState<Celebrity | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile?.role !== 'admin') {
      navigate('/');
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive"
      });
      return;
    }

    fetchData();
  }, [user, profile, authLoading]);

  const fetchData = async () => {
    try {
      const [usersRes, celebritiesRes, plansRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('celebrities').select('*').order('created_at', { ascending: false }),
        supabase.from('plans').select('*').order('price')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (celebritiesRes.error) throw celebritiesRes.error;
      if (plansRes.error) throw plansRes.error;

      setUsers(usersRes.data || []);
      setCelebrities(celebritiesRes.data || []);
      setPlans(plansRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "User Updated",
        description: "User has been updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateCelebrity = async (celebrityId: string, updates: Partial<Celebrity>) => {
    try {
      const { error } = await supabase
        .from('celebrities')
        .update(updates)
        .eq('id', celebrityId);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Celebrity Updated",
        description: "Celebrity has been updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updatePlan = async (planId: string, updates: Partial<Plan>) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Plan Updated",
        description: "Plan has been updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    totalCelebrities: celebrities.length,
    activeCelebrities: celebrities.filter(c => c.is_active).length,
    premiumUsers: users.filter(u => u.plan === 'premium').length,
    eliteUsers: users.filter(u => u.plan === 'elite').length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Main Site
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{stats.activeUsers} active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Celebrities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCelebrities}</div>
              <p className="text-xs text-muted-foreground">{stats.activeCelebrities} active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.premiumUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Elite Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eliteUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="celebrities" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Celebrities
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.plan === 'elite' ? 'default' : 'outline'}>
                            {user.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={(checked) => updateUser(user.id, { is_active: checked })}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="celebrities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Celebrity Management</CardTitle>
                <CardDescription>Manage celebrity profiles and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {celebrities.map((celebrity) => (
                      <TableRow key={celebrity.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {celebrity.name}
                            {celebrity.is_verified && (
                              <Badge variant="default" className="text-xs">Verified</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{celebrity.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {celebrity.rating}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>Wish: ₹{celebrity.service_prices?.general_wish || 0}</div>
                            <div>Image: ₹{celebrity.service_prices?.image_promotion || 0}</div>
                            <div>Video: ₹{celebrity.service_prices?.video_promotion || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={celebrity.is_active ? 'default' : 'destructive'}>
                            {celebrity.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingCelebrity(celebrity)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Switch
                              checked={celebrity.is_active}
                              onCheckedChange={(checked) => updateCelebrity(celebrity.id, { is_active: checked })}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plan Management</CardTitle>
                <CardDescription>Manage subscription plans and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Service Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{plan.name}</span>
                            {plan.is_popular && (
                              <Badge variant="default" className="text-xs">Popular</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>₹{plan.price}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            L1: {plan.referral_commission_l1}%
                            {plan.referral_commission_l2 > 0 && (
                              <div>L2: {plan.referral_commission_l2}%</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{plan.service_discount_percentage}%</TableCell>
                        <TableCell>
                          <Badge variant={plan.is_active ? 'default' : 'destructive'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingPlan(plan)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={(checked) => updatePlan(plan.id, { is_active: checked })}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <AdminLocations />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({...editingUser, role: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="celebrity">Celebrity</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select 
                  value={editingUser.plan} 
                  onValueChange={(value) => setEditingUser({...editingUser, plan: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  updateUser(editingUser.id, { role: editingUser.role, plan: editingUser.plan });
                  setEditingUser(null);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Celebrity Dialog */}
      <Dialog open={!!editingCelebrity} onOpenChange={() => setEditingCelebrity(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Celebrity Pricing</DialogTitle>
            <DialogDescription>Update celebrity service pricing</DialogDescription>
          </DialogHeader>
          {editingCelebrity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>General Wish Price (₹)</Label>
                <Input 
                  type="number" 
                  value={editingCelebrity.service_prices?.general_wish || 0}
                  onChange={(e) => setEditingCelebrity({
                    ...editingCelebrity, 
                    service_prices: {
                      ...editingCelebrity.service_prices,
                      general_wish: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Image Promotion Price (₹)</Label>
                <Input 
                  type="number" 
                  value={editingCelebrity.service_prices?.image_promotion || 0}
                  onChange={(e) => setEditingCelebrity({
                    ...editingCelebrity, 
                    service_prices: {
                      ...editingCelebrity.service_prices,
                      image_promotion: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Video Promotion Price (₹)</Label>
                <Input 
                  type="number" 
                  value={editingCelebrity.service_prices?.video_promotion || 0}
                  onChange={(e) => setEditingCelebrity({
                    ...editingCelebrity, 
                    service_prices: {
                      ...editingCelebrity.service_prices,
                      video_promotion: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCelebrity(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  updateCelebrity(editingCelebrity.id, {
                    service_prices: editingCelebrity.service_prices
                  });
                  setEditingCelebrity(null);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>Update plan pricing and commission rates</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input 
                    type="number" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan, 
                      price: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Discount (%)</Label>
                  <Input 
                    type="number" 
                    value={editingPlan.service_discount_percentage}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan, 
                      service_discount_percentage: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>L1 Commission (%)</Label>
                  <Input 
                    type="number" 
                    value={editingPlan.referral_commission_l1}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan, 
                      referral_commission_l1: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>L2 Commission (%)</Label>
                  <Input 
                    type="number" 
                    value={editingPlan.referral_commission_l2}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan, 
                      referral_commission_l2: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPlan(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  updatePlan(editingPlan.id, {
                    price: editingPlan.price,
                    service_discount_percentage: editingPlan.service_discount_percentage,
                    referral_commission_l1: editingPlan.referral_commission_l1,
                    referral_commission_l2: editingPlan.referral_commission_l2
                  });
                  setEditingPlan(null);
                }}>
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