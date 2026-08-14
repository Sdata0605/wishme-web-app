import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, Crown, Edit, Search, Filter, Eye, Building2, MapPin, CreditCard, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  role: 'user' | 'celebrity' | 'admin';
  plan: 'basic' | 'premium' | 'elite';
  created_at: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  bank_account_holder_name?: string;
  aadhaar_number?: string;
  pan_number?: string;
  aadhaar_verified?: boolean;
  pan_verified?: boolean;
  profile_completion_percentage?: number;
  is_active?: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
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

      await fetchUsers();
      toast.success("User updated successfully");
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    
    return matchesSearch && matchesRole && matchesPlan;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'celebrity':
        return <Badge variant="default"><Users className="w-3 h-3 mr-1" />Celebrity</Badge>;
      default:
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />User</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'elite':
        return <Badge variant="destructive">Elite</Badge>;
      case 'premium':
        return <Badge variant="default">Premium</Badge>;
      default:
        return <Badge variant="secondary">Basic</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage all registered users, their roles, and subscription plans.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Celebrities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === 'celebrity').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.plan !== 'basic').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="celebrity">Celebrity</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border rounded-lg gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRoleBadge(user.role)}
                      {getPlanBadge(user.plan)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingUser(user)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editingUser.first_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editingUser.last_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={editingUser.role} onValueChange={(value: 'user' | 'celebrity' | 'admin') => setEditingUser({ ...editingUser, role: value })}>
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
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select value={editingUser.plan} onValueChange={(value: 'basic' | 'premium' | 'elite') => setEditingUser({ ...editingUser, plan: value })}>
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
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateUser(editingUser.id, editingUser)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-4xl w-[calc(100vw-16px)] sm:w-[calc(100vw-32px)] max-h-[90vh] p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border sticky top-0 bg-background z-10">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">User Details - {viewingUser?.first_name} {viewingUser?.last_name}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 sm:p-6 no-scrollbar scroll-touch">
          {viewingUser && (
            <div className="space-y-6">
              {/* Profile Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span>Progress</span>
                    <span>{viewingUser.profile_completion_percentage || 20}%</span>
                  </div>
                  <Progress value={viewingUser.profile_completion_percentage || 20} />
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Users className="w-5 h-5 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.first_name || "Not set"}</p>
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.last_name || "Not set"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.phone || "Not set"}</p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    {getRoleBadge(viewingUser.role)}
                  </div>
                  <div>
                    <Label>Plan</Label>
                    {getPlanBadge(viewingUser.plan)}
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="w-5 h-5 mr-2" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Address</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.address || "Not provided"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Building2 className="w-5 h-5 mr-2" />
                    Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.bank_name || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Account Holder Name</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.bank_account_holder_name || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <p className="text-sm text-muted-foreground">
                      {viewingUser.bank_account_number ? "****" + viewingUser.bank_account_number.slice(-4) : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <p className="text-sm text-muted-foreground">{viewingUser.bank_ifsc || "Not provided"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* KYC Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="w-5 h-5 mr-2" />
                    KYC Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Aadhaar Number</Label>
                      <Badge variant={viewingUser.aadhaar_verified ? "default" : "secondary"}>
                        {viewingUser.aadhaar_verified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {viewingUser.aadhaar_number ? "****" + viewingUser.aadhaar_number.slice(-4) : "Not provided"}
                    </p>
                    {!viewingUser.aadhaar_verified && viewingUser.aadhaar_number && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => updateUser(viewingUser.id, { aadhaar_verified: true } as any)}
                      >
                        Verify Aadhaar
                      </Button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>PAN Number</Label>
                      <Badge variant={viewingUser.pan_verified ? "default" : "secondary"}>
                        {viewingUser.pan_verified ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{viewingUser.pan_number || "Not provided"}</p>
                    {(viewingUser as any).pan_document_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => window.open((viewingUser as any).pan_document_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View PAN Document
                      </Button>
                    )}
                    {!viewingUser.pan_verified && viewingUser.pan_number && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 ml-2"
                        onClick={() => updateUser(viewingUser.id, { pan_verified: true } as any)}
                      >
                        Verify PAN
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}