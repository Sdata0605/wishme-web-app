import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Star, CheckCircle, XCircle, Plus, Calendar, Upload, Music, Image as ImageIcon, Video, Trash2, Eye, Settings, IndianRupee, Heart, Lock, Key } from "lucide-react";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  bio?: string;
  image_url?: string;
  service_prices: any;
  delivery_time: string;
  followers?: string;
  location?: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  total_earnings?: number;
  available_balance?: number;
  profile_id?: string;
  consent_status?: string;
  consent_photo_url?: string;
  consent_video_url?: string;
  consent_given_at?: string;
  profiles?: {
    email: string;
    first_name?: string;
    last_name?: string;
    user_id?: string;
  };
}

interface CelebrityApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  stage_name: string;
  bio: string;
  category: string;
  date_of_birth?: string;
  social_media?: any;
  portfolio_link?: string;
  achievements?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
}

interface FavoritePricing {
  id: string;
  celebrity_id: string;
  price: number;
  referrer_commission_percentage: number;
  celebrity_commission_percentage: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminCelebrities() {
  const navigate = useNavigate();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [applications, setApplications] = useState<CelebrityApplication[]>([]);
  const [favoritePricing, setFavoritePricing] = useState<FavoritePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pricingSearchTerm, setPricingSearchTerm] = useState("");
  const [editingCelebrity, setEditingCelebrity] = useState<Celebrity | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<FavoritePricing | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [approvingApplication, setApprovingApplication] = useState<CelebrityApplication | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState("");
  const [resetPasswordCelebrity, setResetPasswordCelebrity] = useState<Celebrity | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newCelebrity, setNewCelebrity] = useState<any>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    name: "",
    category: "",
    bio: "",
    service_prices: {
      general_wish: 5000,
      image_promotion: 10000,
      video_promotion: 25000,
      text_message: 2000
    },
    delivery_time: "24 hours",
    location: "",
    followers: "",
    image_url: "",
    is_verified: false,
    is_active: true,
    commission_percentage: 70,
    social_media: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCelebrities();
    fetchFavoritePricing();
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrity_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load applications",
        variant: "destructive"
      });
    }
  };

  const approveApplication = async () => {
    if (!approvingApplication) return;
    
    if (!approvalPassword || approvalPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: approvingApplication.email,
        password: approvalPassword,
        options: {
          data: {
            first_name: approvingApplication.first_name,
            last_name: approvingApplication.last_name,
            phone: approvingApplication.phone || ''
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Create celebrity record
      const { error: celebrityError } = await supabase
        .from('celebrities')
        .insert([{
          profile_id: profileData.id,
          name: approvingApplication.stage_name,
          category: approvingApplication.category || 'General',
          bio: approvingApplication.bio,
          date_of_birth: approvingApplication.date_of_birth,
          social_media: approvingApplication.social_media || {},
          is_verified: true,
          is_active: true,
          commission_percentage: 70,
          service_prices: {
            general_wish: 5000,
            image_promotion: 10000,
            video_promotion: 25000,
            text_message: 2000
          }
        }]);

      if (celebrityError) throw celebrityError;

      // Update application status
      const { error: updateError } = await supabase
        .from('celebrity_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', approvingApplication.id);

      if (updateError) throw updateError;

      await fetchCelebrities();
      await fetchApplications();
      
      toast({
        title: "Success",
        description: "Celebrity account created successfully"
      });
      
      setApprovalDialogOpen(false);
      setApprovingApplication(null);
      setApprovalPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not approve application",
        variant: "destructive"
      });
    }
  };

  const rejectApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('celebrity_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
      toast({
        title: "Success",
        description: "Application rejected"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not reject application",
        variant: "destructive"
      });
    }
  };

  const resetCelebrityPassword = async () => {
    if (!resetPasswordCelebrity || !newPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Use both user_id and email as fallback
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: resetPasswordCelebrity.profiles?.user_id,
          email: resetPasswordCelebrity.profiles?.email,
          password: newPassword
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Celebrity password updated successfully"
      });

      setResetPasswordDialogOpen(false);
      setResetPasswordCelebrity(null);
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not reset password",
        variant: "destructive"
      });
    }
  };

  const fetchCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select(`
          *,
          profiles!celebrities_profile_id_fkey(
            email,
            first_name,
            last_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load celebrities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoritePricing = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrity_favorite_pricing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavoritePricing(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load favorite pricing",
        variant: "destructive"
      });
    }
  };

  const upsertFavoritePricing = async (celebrityId: string, pricing: Partial<FavoritePricing>) => {
    try {
      const { error } = await supabase
        .from('celebrity_favorite_pricing')
        .upsert({
          celebrity_id: celebrityId,
          price: pricing.price || 999,
          referrer_commission_percentage: pricing.referrer_commission_percentage || 10,
          celebrity_commission_percentage: pricing.celebrity_commission_percentage || 5,
          is_enabled: pricing.is_enabled ?? true
        }, {
          onConflict: 'celebrity_id'
        });

      if (error) throw error;

      await fetchFavoritePricing();
      toast({
        title: "Success",
        description: "Favorite pricing updated successfully"
      });
      setPricingDialogOpen(false);
      setEditingPricing(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update favorite pricing",
        variant: "destructive"
      });
    }
  };

  const toggleFavoriteEnabled = async (celebrityId: string, currentStatus: boolean) => {
    try {
      const existingPricing = favoritePricing.find(p => p.celebrity_id === celebrityId);
      
      const { error } = await supabase
        .from('celebrity_favorite_pricing')
        .upsert({
          celebrity_id: celebrityId,
          price: existingPricing?.price || 999,
          referrer_commission_percentage: existingPricing?.referrer_commission_percentage || 10,
          celebrity_commission_percentage: existingPricing?.celebrity_commission_percentage || 5,
          is_enabled: !currentStatus
        }, {
          onConflict: 'celebrity_id'
        });

      if (error) throw error;

      await fetchFavoritePricing();
      toast({
        title: "Success",
        description: `Favorite subscription ${!currentStatus ? 'enabled' : 'disabled'} for celebrity`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update favorite status",
        variant: "destructive"
      });
    }
  };

  const addCelebrity = async () => {
    try {
      // Validate required fields
      if (!newCelebrity.email || !newCelebrity.password || !newCelebrity.firstName || !newCelebrity.lastName || !newCelebrity.name) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields (marked with *)",
          variant: "destructive"
        });
        return;
      }

      if (newCelebrity.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters",
          variant: "destructive"
        });
        return;
      }

      // Create user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newCelebrity.email,
        password: newCelebrity.password,
        options: {
          data: {
            first_name: newCelebrity.firstName,
            last_name: newCelebrity.lastName,
            phone: newCelebrity.phone || ''
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Wait for profile to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Create celebrity record
      const { error: celebrityError } = await supabase
        .from('celebrities')
        .insert([{
          profile_id: profileData.id,
          name: newCelebrity.name,
          category: newCelebrity.category,
          bio: newCelebrity.bio,
          service_prices: newCelebrity.service_prices,
          delivery_time: newCelebrity.delivery_time,
          location: newCelebrity.location,
          followers: newCelebrity.followers,
          image_url: newCelebrity.image_url,
          is_verified: newCelebrity.is_verified,
          is_active: newCelebrity.is_active,
          commission_percentage: newCelebrity.commission_percentage,
          social_media: newCelebrity.social_media || {}
        }]);

      if (celebrityError) throw celebrityError;

      await fetchCelebrities();
      toast({
        title: "Success",
        description: "Celebrity account created successfully"
      });
      setAddDialogOpen(false);
      setNewCelebrity({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        name: "",
        category: "",
        bio: "",
        service_prices: {
          general_wish: 5000,
          image_promotion: 10000,
          video_promotion: 25000,
          text_message: 2000
        },
        delivery_time: "24 hours",
        location: "",
        followers: "",
        image_url: "",
        is_verified: false,
        is_active: true,
        commission_percentage: 70,
        social_media: {}
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not add celebrity",
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

      await fetchCelebrities();
      toast({
        title: "Success",
        description: "Celebrity updated successfully"
      });
      setEditDialogOpen(false);
      setEditingCelebrity(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update celebrity",
        variant: "destructive"
      });
    }
  };

  const filteredCelebrities = celebrities.filter(celebrity =>
    !searchTerm || 
    celebrity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    celebrity.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Celebrity Management</h1>
          <p className="text-muted-foreground">Loading celebrities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Celebrity Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage celebrity profiles, pricing, and verification status.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button size="sm" className="sm:size-default" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Celebrity</span>
            <span className="sm:hidden">Add</span>
          </Button>
          <Button size="sm" className="sm:size-default" variant="outline" onClick={() => navigate('/admin/celebrity-categories')}>
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Manage Categories</span>
            <span className="sm:hidden">Categories</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="celebrities" className="space-y-4">
        <div className="w-full overflow-x-auto no-scrollbar scroll-touch">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="celebrities">Celebrities</TabsTrigger>
            <TabsTrigger value="applications">
              Applications ({applications.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="favorite-pricing" className="whitespace-nowrap">
              <Heart className="w-4 h-4 mr-2" />
              Favorite Pricing
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Celebrities Tab */}
        <TabsContent value="celebrities" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Celebrities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{celebrities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{celebrities.filter(c => c.is_verified).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{celebrities.filter(c => c.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(celebrities.reduce((acc, c) => acc + c.rating, 0) / celebrities.length || 0).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Celebrities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Celebrities ({filteredCelebrities.length})</CardTitle>
          <CardDescription>
            Manage celebrity profiles and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="block md:hidden space-y-3">
            {filteredCelebrities.map((celebrity) => (
              <div key={celebrity.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start gap-3">
                  {celebrity.image_url && (
                    <img src={celebrity.image_url} alt={celebrity.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{celebrity.name}</p>
                    <p className="text-xs text-muted-foreground">{celebrity.location}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{celebrity.category}</Badge>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{celebrity.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">₹{celebrity.total_earnings?.toLocaleString() || 0} earned</span>
                  <span>₹{(celebrity.service_prices?.general_wish || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Badge variant={celebrity.is_verified ? "default" : "secondary"} className="text-[10px]">
                      {celebrity.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                    <Badge variant={celebrity.is_active ? "default" : "secondary"} className="text-[10px]">
                      {celebrity.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setResetPasswordCelebrity(celebrity); setResetPasswordDialogOpen(true); }}>
                      <Lock className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCelebrity(celebrity); setEditDialogOpen(true); }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/admin/celebrities/${celebrity.id}/edit`)}>
                      <Eye className="w-3 h-3 mr-1" /> Full
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Celebrity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>General Price</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCelebrities.map((celebrity) => (
                <TableRow key={celebrity.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {celebrity.image_url && (
                        <img 
                          src={celebrity.image_url} 
                          alt={celebrity.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{celebrity.name}</div>
                        <div className="text-sm text-muted-foreground">{celebrity.location}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{celebrity.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">
                        {celebrity.profiles?.email || "No email"}
                      </div>
                      <div className="text-muted-foreground">
                        {celebrity.profiles?.first_name} {celebrity.profiles?.last_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center">
                        <IndianRupee className="w-3 h-3 mr-1" />
                        <span className="font-medium">{celebrity.total_earnings?.toLocaleString() || 0}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Bal: ₹{celebrity.available_balance?.toLocaleString() || 0}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>₹{(celebrity.service_prices?.general_wish || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{celebrity.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({celebrity.review_count})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        celebrity.consent_status === 'approved' ? 'default' : 
                        celebrity.consent_status === 'submitted' ? 'secondary' : 
                        'outline'
                      }
                      className={`w-fit ${celebrity.consent_status === 'submitted' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300' : ''}`}
                    >
                      {celebrity.consent_status === 'approved' ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />Approved</>
                      ) : celebrity.consent_status === 'submitted' ? (
                        <><Eye className="w-3 h-3 mr-1" />Pending Review</>
                      ) : celebrity.consent_status === 'rejected' ? (
                        <><XCircle className="w-3 h-3 mr-1" />Rejected</>
                      ) : (
                        'No Consent'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <Badge variant={celebrity.is_verified ? "default" : "secondary"} className="w-fit">
                        {celebrity.is_verified ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />Verified</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />Not Verified</>
                        )}
                      </Badge>
                      <Badge variant={celebrity.is_active ? "default" : "secondary"} className="w-fit">
                        {celebrity.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetPasswordCelebrity(celebrity);
                          setResetPasswordDialogOpen(true);
                        }}
                        title="Reset Password"
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCelebrity(celebrity);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/celebrities/${celebrity.id}/edit`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Full Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          {/* Stats Cards */}
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.filter(a => a.status === 'pending').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.filter(a => a.status === 'approved').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applications.filter(a => a.status === 'rejected').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Celebrity Applications</CardTitle>
              <CardDescription>Review and approve celebrity signup applications</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile card view */}
              <div className="block md:hidden space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{app.first_name} {app.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.stage_name}</p>
                      </div>
                      <Badge 
                        variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {app.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{app.category || 'General'}</Badge>
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => { setApprovingApplication(app); setApprovalDialogOpen(true); }}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => rejectApplication(app.id)}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Stage Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{app.first_name} {app.last_name}</div>
                          <div className="text-sm text-muted-foreground">{app.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{app.stage_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{app.category || 'General'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{app.email}</div>
                          <div className="text-muted-foreground">{app.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            app.status === 'approved' ? 'default' : 
                            app.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {app.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setApprovingApplication(app);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectApplication(app.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {app.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">
                            Reviewed on {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : 'N/A'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorite Pricing Tab */}
        <TabsContent value="favorite-pricing" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Celebrities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{celebrities.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Favorites Enabled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{favoritePricing.filter(p => p.is_enabled).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{favoritePricing.length > 0 ? Math.round(favoritePricing.reduce((acc, p) => acc + p.price, 0) / favoritePricing.length) : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search Celebrity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by celebrity name..."
                  value={pricingSearchTerm}
                  onChange={(e) => setPricingSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Table */}
          <Card>
            <CardHeader>
              <CardTitle>Celebrity Favorite Pricing Configuration</CardTitle>
              <CardDescription>
                Set one-time subscription prices and commission rates for celebrity favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Celebrity</TableHead>
                    <TableHead>Subscription Price</TableHead>
                    <TableHead>Referrer Commission</TableHead>
                    <TableHead>Celebrity Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {celebrities
                    .filter(celebrity =>
                      !pricingSearchTerm ||
                      celebrity.name.toLowerCase().includes(pricingSearchTerm.toLowerCase())
                    )
                    .map((celebrity) => {
                      const pricing = favoritePricing.find(p => p.celebrity_id === celebrity.id);
                      return (
                        <TableRow key={celebrity.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {celebrity.image_url && (
                                <img
                                  src={celebrity.image_url}
                                  alt={celebrity.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">{celebrity.name}</div>
                                <div className="text-sm text-muted-foreground">{celebrity.category}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <IndianRupee className="w-4 h-4 mr-1" />
                              <span className="font-medium">{pricing?.price || 999}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pricing?.referrer_commission_percentage || 10}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pricing?.celebrity_commission_percentage || 5}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={pricing?.is_enabled ?? false}
                              onCheckedChange={() => toggleFavoriteEnabled(celebrity.id, pricing?.is_enabled ?? false)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPricing(pricing || {
                                  id: '',
                                  celebrity_id: celebrity.id,
                                  price: 999,
                                  referrer_commission_percentage: 10,
                                  celebrity_commission_percentage: 5,
                                  is_enabled: true,
                                  created_at: '',
                                  updated_at: ''
                                });
                                setPricingDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Celebrity Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Celebrity</DialogTitle>
            <DialogDescription>
              Create a new celebrity profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-sm">Account Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newEmail">Email *</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newCelebrity.email}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, email: e.target.value })}
                    placeholder="celebrity@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Password *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newCelebrity.password}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, password: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="newFirstName">First Name *</Label>
                  <Input
                    id="newFirstName"
                    value={newCelebrity.firstName}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, firstName: e.target.value })}
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newLastName">Last Name *</Label>
                  <Input
                    id="newLastName"
                    value={newCelebrity.lastName}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, lastName: e.target.value })}
                    placeholder="Last name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPhone">Phone</Label>
                  <Input
                    id="newPhone"
                    value={newCelebrity.phone}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, phone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newName">Celebrity/Stage Name *</Label>
                <Input
                  id="newName"
                  value={newCelebrity.name}
                  onChange={(e) => setNewCelebrity({ ...newCelebrity, name: e.target.value })}
                  placeholder="Celebrity name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newCategory">Category *</Label>
                <Input
                  id="newCategory"
                  value={newCelebrity.category}
                  onChange={(e) => setNewCelebrity({ ...newCelebrity, category: e.target.value })}
                  placeholder="e.g., Actor/Actress"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="newBio">Bio</Label>
              <Textarea
                id="newBio"
                value={newCelebrity.bio}
                onChange={(e) => setNewCelebrity({ ...newCelebrity, bio: e.target.value })}
                placeholder="Celebrity bio"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="newGeneralPrice">General Wish Price (₹)</Label>
                <Input
                  id="newGeneralPrice"
                  type="number"
                  value={newCelebrity.service_prices?.general_wish || 0}
                  onChange={(e) => setNewCelebrity({ 
                    ...newCelebrity, 
                    service_prices: { 
                      ...newCelebrity.service_prices, 
                      general_wish: parseInt(e.target.value) 
                    } 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="newImagePrice">Image Promotion Price (₹)</Label>
                <Input
                  id="newImagePrice"
                  type="number"
                  value={newCelebrity.service_prices?.image_promotion || 0}
                  onChange={(e) => setNewCelebrity({ 
                    ...newCelebrity, 
                    service_prices: { 
                      ...newCelebrity.service_prices, 
                      image_promotion: parseInt(e.target.value) 
                    } 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="newVideoPrice">Video Promotion Price (₹)</Label>
                <Input
                  id="newVideoPrice"
                  type="number"
                  value={newCelebrity.service_prices?.video_promotion || 0}
                  onChange={(e) => setNewCelebrity({ 
                    ...newCelebrity, 
                    service_prices: { 
                      ...newCelebrity.service_prices, 
                      video_promotion: parseInt(e.target.value) 
                    } 
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newLocation">Location</Label>
                <Input
                  id="newLocation"
                  value={newCelebrity.location}
                  onChange={(e) => setNewCelebrity({ ...newCelebrity, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <Label htmlFor="newFollowers">Followers</Label>
                <Input
                  id="newFollowers"
                  value={newCelebrity.followers}
                  onChange={(e) => setNewCelebrity({ ...newCelebrity, followers: e.target.value })}
                  placeholder="e.g., 1M+"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="newImageUrl">Profile Image URL</Label>
              <Input
                id="newImageUrl"
                value={newCelebrity.image_url}
                onChange={(e) => setNewCelebrity({ ...newCelebrity, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Social Media (optional)</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Instagram @handle" onChange={(e) => {
                  const sm = newCelebrity.social_media || {};
                  sm.instagram = e.target.value;
                  setNewCelebrity({ ...newCelebrity, social_media: sm });
                }} />
                <Input placeholder="YouTube channel" onChange={(e) => {
                  const sm = newCelebrity.social_media || {};
                  sm.youtube = e.target.value;
                  setNewCelebrity({ ...newCelebrity, social_media: sm });
                }} />
                <Input placeholder="Twitter @handle" onChange={(e) => {
                  const sm = newCelebrity.social_media || {};
                  sm.twitter = e.target.value;
                  setNewCelebrity({ ...newCelebrity, social_media: sm });
                }} />
                <Input placeholder="Facebook profile" onChange={(e) => {
                  const sm = newCelebrity.social_media || {};
                  sm.facebook = e.target.value;
                  setNewCelebrity({ ...newCelebrity, social_media: sm });
                }} />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Settings & Status</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="newCommission">Commission %</Label>
                  <Input
                    id="newCommission"
                    type="number"
                    value={newCelebrity.commission_percentage}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, commission_percentage: parseInt(e.target.value) || 70 })}
                    placeholder="70"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="newDeliveryTime">Delivery Time</Label>
                  <Input
                    id="newDeliveryTime"
                    value={newCelebrity.delivery_time}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, delivery_time: e.target.value })}
                    placeholder="24 hours"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="newVerified"
                    checked={newCelebrity.is_verified}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, is_verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="newVerified">Verified</Label>
                  
                  <input
                    type="checkbox"
                    id="newActive"
                    checked={newCelebrity.is_active}
                    onChange={(e) => setNewCelebrity({ ...newCelebrity, is_active: e.target.checked })}
                    className="w-4 h-4 ml-4"
                  />
                  <Label htmlFor="newActive">Active</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCelebrity}>
              Add Celebrity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Celebrity Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Celebrity</DialogTitle>
            <DialogDescription>
              Update celebrity information and pricing
            </DialogDescription>
          </DialogHeader>
          {editingCelebrity && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingCelebrity.name}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={editingCelebrity.category}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, category: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="generalPrice">General Wish Price (₹)</Label>
                  <Input
                    id="generalPrice"
                    type="number"
                    value={editingCelebrity.service_prices?.general_wish || 0}
                    onChange={(e) => setEditingCelebrity({ 
                      ...editingCelebrity, 
                      service_prices: { ...editingCelebrity.service_prices, general_wish: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="imagePrice">Image Promotion Price (₹)</Label>
                  <Input
                    id="imagePrice"
                    type="number"
                    value={editingCelebrity.service_prices?.image_promotion || 0}
                    onChange={(e) => setEditingCelebrity({ 
                      ...editingCelebrity, 
                      service_prices: { ...editingCelebrity.service_prices, image_promotion: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="videoPrice">Video Promotion Price (₹)</Label>
                  <Input
                    id="videoPrice"
                    type="number"
                    value={editingCelebrity.service_prices?.video_promotion || 0}
                    onChange={(e) => setEditingCelebrity({ 
                      ...editingCelebrity, 
                      service_prices: { ...editingCelebrity.service_prices, video_promotion: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    value={editingCelebrity.delivery_time}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, delivery_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editingCelebrity.location || ""}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingCelebrity.is_verified}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, is_verified: e.target.checked })}
                  />
                  <span>Verified</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingCelebrity.is_active}
                    onChange={(e) => setEditingCelebrity({ ...editingCelebrity, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateCelebrity(editingCelebrity.id, editingCelebrity)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Favorite Pricing Edit Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Favorite Pricing</DialogTitle>
            <DialogDescription>
              Set subscription price and commission rates for this celebrity
            </DialogDescription>
          </DialogHeader>
          {editingPricing && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subscriptionPrice">Subscription Price (₹)</Label>
                <Input
                  id="subscriptionPrice"
                  type="number"
                  value={editingPricing.price}
                  onChange={(e) => setEditingPricing({ 
                    ...editingPricing, 
                    price: parseInt(e.target.value) || 0
                  })}
                  placeholder="999"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  One-time payment for lifetime access
                </p>
              </div>

              <div>
                <Label htmlFor="referrerCommission">Referrer Commission (%)</Label>
                <Input
                  id="referrerCommission"
                  type="number"
                  value={editingPricing.referrer_commission_percentage}
                  onChange={(e) => setEditingPricing({ 
                    ...editingPricing, 
                    referrer_commission_percentage: parseInt(e.target.value) || 0
                  })}
                  placeholder="10"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Commission for L1 referrer (10% recommended)
                </p>
              </div>

              <div>
                <Label htmlFor="celebrityCommission">Celebrity Commission (%)</Label>
                <Input
                  id="celebrityCommission"
                  type="number"
                  value={editingPricing.celebrity_commission_percentage}
                  onChange={(e) => setEditingPricing({ 
                    ...editingPricing, 
                    celebrity_commission_percentage: parseInt(e.target.value) || 0
                  })}
                  placeholder="5"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Commission for celebrity (5% recommended)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabledSwitch"
                  checked={editingPricing.is_enabled}
                  onCheckedChange={(checked) => setEditingPricing({ 
                    ...editingPricing, 
                    is_enabled: checked
                  })}
                />
                <Label htmlFor="enabledSwitch">Enable Favorite Subscription</Label>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <div className="font-medium">Commission Breakdown:</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Referrer gets:</span>
                  <span>₹{Math.round(editingPricing.price * editingPricing.referrer_commission_percentage / 100)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Celebrity gets (before TDS):</span>
                  <span>₹{Math.round(editingPricing.price * editingPricing.celebrity_commission_percentage / 100)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee:</span>
                  <span>₹{editingPricing.price - Math.round(editingPricing.price * editingPricing.referrer_commission_percentage / 100) - Math.round(editingPricing.price * editingPricing.celebrity_commission_percentage / 100)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => upsertFavoritePricing(editingPricing.celebrity_id, editingPricing)}>
                  Save Pricing
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Celebrity Application</DialogTitle>
            <DialogDescription>
              Create account credentials for {approvingApplication?.stage_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Name:</div>
                <div>{approvingApplication?.first_name} {approvingApplication?.last_name}</div>
                <div className="font-medium">Stage Name:</div>
                <div>{approvingApplication?.stage_name}</div>
                <div className="font-medium">Email:</div>
                <div>{approvingApplication?.email}</div>
                <div className="font-medium">Phone:</div>
                <div>{approvingApplication?.phone}</div>
              </div>
            </div>

            <div>
              <Label htmlFor="approvalPassword">Set Password for Celebrity *</Label>
              <Input
                id="approvalPassword"
                type="password"
                value={approvalPassword}
                onChange={(e) => setApprovalPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Celebrity will use their email and this password to log in
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setApprovalDialogOpen(false);
                setApprovingApplication(null);
                setApprovalPassword("");
              }}>
                Cancel
              </Button>
              <Button onClick={approveApplication}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Celebrity Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordCelebrity?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Celebrity:</div>
                <div>{resetPasswordCelebrity?.name}</div>
                <div className="font-medium">Email:</div>
                <div>{resetPasswordCelebrity?.profiles?.email}</div>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setResetPasswordDialogOpen(false);
                setResetPasswordCelebrity(null);
                setNewPassword("");
              }}>
                Cancel
              </Button>
              <Button onClick={resetCelebrityPassword}>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}