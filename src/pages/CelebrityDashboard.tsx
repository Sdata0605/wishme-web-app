import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Star,
  Wallet,
  Camera,
  Video,
  Calendar,
  Upload,
  Eye,
  Settings,
  Bell,
  Mic,
  AlertCircle,
  UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CelebrityContentManager } from "@/components/celebrity/CelebrityContentManager";
import { ConsentCapture } from "@/components/celebrity/ConsentCapture";
import { DashboardSwitcher } from "@/components/dashboard/DashboardSwitcher";
import { WalletTab } from "@/components/celebrity/WalletTab";
import { BookingsTab } from "@/components/celebrity/BookingsTab";
import { ReviewsTab } from "@/components/celebrity/ReviewsTab";
import { TDSReportsTab } from "@/components/celebrity/TDSReportsTab";
import { FollowersTab } from "@/components/celebrity/FollowersTab";
import { MessagesTab } from "@/components/celebrity/MessagesTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function CelebrityDashboard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, changePassword, signOut } = useAuth();
  const { toast } = useToast();
  const [celebrity, setCelebrity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noCelebrityAccess, setNoCelebrityAccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    totalBookings: 0,
    rating: 0,
    reviewCount: 0
  });

  // Admin "View As" feature
  const [allCelebrities, setAllCelebrities] = useState<any[]>([]);
  const viewingCelebrityId = searchParams.get('celebrityId');
  const isAdmin = profile?.role === 'admin';

  // Upload refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const promoPhotoInputRef = useRef<HTMLInputElement>(null);
  const promoVideoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchCelebrityData();
      if (isAdmin) {
        fetchAllCelebrities();
      }
    }
  }, [profile, viewingCelebrityId]);

  const fetchAllCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, name, profile_id')
        .order('name');

      if (error) throw error;
      setAllCelebrities(data || []);
    } catch (error) {
      console.error('Error fetching all celebrities:', error);
    }
  };

  const fetchCelebrityData = async () => {
    try {
      let query = supabase.from('celebrities').select('*');

      // If admin is viewing a specific celebrity
      if (isAdmin && viewingCelebrityId) {
        query = query.eq('id', viewingCelebrityId);
      } else {
        // Normal celebrity viewing their own dashboard
        query = query.eq('profile_id', profile?.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setCelebrity(data);
      setNoCelebrityAccess(!data && !isAdmin);
      
      // Fetch real stats
      if (data?.id) {
        await fetchStats(data.id);
      }
    } catch (error) {
      console.error('Error fetching celebrity data:', error);
      setNoCelebrityAccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCelebrityChange = (celebrityId: string) => {
    if (celebrityId === 'own') {
      navigate('/celebrity-dashboard');
    } else {
      navigate(`/celebrity-dashboard?celebrityId=${celebrityId}`);
    }
  };

  const fetchStats = async (celebrityId: string) => {
    try {
      // Fetch bookings count and total earnings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('celebrity_commission, status')
        .eq('celebrity_id', celebrityId);

      if (bookingsError) throw bookingsError;

      const completedBookings = bookingsData?.filter(b => b.status === 'completed') || [];
      const pendingBookings = bookingsData?.filter(b => b.status === 'pending' || b.status === 'in_progress') || [];
      
      const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.celebrity_commission || 0), 0);
      const pendingEarnings = pendingBookings.reduce((sum, b) => sum + (b.celebrity_commission || 0), 0);

      setStats({
        totalEarnings,
        pendingEarnings,
        totalBookings: bookingsData?.length || 0,
        rating: celebrity?.rating || 0,
        reviewCount: celebrity?.review_count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters"
      });
      return;
    }

    setChangingPassword(true);
    const { error } = await changePassword(newPassword);
    
    if (!error) {
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };


  const buildBaseFolder = () => {
    return (
      celebrity?.name?.trim().replace(/\s+/g, '-').toLowerCase() ||
      celebrity?.id ||
      profile?.id || 'unknown'
    );
  };

  const handleAvatarUploadClick = () => avatarInputRef.current?.click();
  const handlePromoPhotoUploadClick = () => promoPhotoInputRef.current?.click();
  const handlePromoVideoUploadClick = () => promoVideoInputRef.current?.click();

  const handleAvatarFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!celebrity) {
      toast({ title: 'Not a celebrity', description: 'Sign up as a celebrity to upload.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const folder = `${buildBaseFolder()}/avatar`;
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const path = `${folder}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('celebrity-avatars').upload(path, file);
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('celebrity-avatars')
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
      
      // Update celebrity record with the first image as image_url
      if (uploadedUrls.length > 0) {
        const { error: updateError } = await supabase
          .from('celebrities')
          .update({ image_url: uploadedUrls[0] })
          .eq('id', celebrity.id);
        
        if (updateError) throw updateError;
        await fetchCelebrityData(); // Refresh data
      }
      
      toast({ title: 'Uploaded', description: 'Avatar photos uploaded successfully.' });
    } catch (e:any) {
      toast({ title: 'Upload failed', description: e.message || 'Could not upload photos', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePromoFile = async (file: File, type: 'photo' | 'video') => {
    if (!file) return;
    if (!celebrity) {
      toast({ title: 'Not a celebrity', description: 'Sign up as a celebrity to upload.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const folder = `${buildBaseFolder()}/promotional/${type}`;
      const path = `${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('promotional-content').upload(path, file);
      if (error) throw error;
      toast({ title: 'Uploaded', description: `${type === 'photo' ? 'Photo' : 'Video'} uploaded successfully.` });
    } catch (e:any) {
      toast({ title: 'Upload failed', description: e.message || 'Could not upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Guard: if no profile after loading, redirect to login
  if (!loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center space-y-4 pt-6">
            <p className="text-muted-foreground">Please log in to access the Celebrity Dashboard.</p>
            <Button onClick={() => navigate('/auth')} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (noCelebrityAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">This area is for celebrities only.</p>
            <p className="text-muted-foreground text-sm">If you are a celebrity, please contact support.</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl md:text-3xl font-bold">Celebrity Dashboard</h1>
              <p className="text-sm md:text-base opacity-90">Welcome back, {celebrity?.name || profile?.first_name}</p>
              {isAdmin && viewingCelebrityId && (
                <Badge variant="secondary" className="mt-2">
                  <UserCog className="w-3 h-3 mr-1" />
                  Admin View Mode
                </Badge>
              )}
            </div>
            {!isMobile && (
              <div className="flex items-center space-x-2 md:space-x-4">
                {isAdmin && (
                  <Select value={viewingCelebrityId || 'own'} onValueChange={handleCelebrityChange}>
                    <SelectTrigger className="w-[200px] bg-white text-gray-900">
                      <SelectValue placeholder="View as..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">My Dashboard</SelectItem>
                      {allCelebrities.map((celeb) => (
                        <SelectItem key={celeb.id} value={celeb.id}>
                          {celeb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="secondary" size={isMobile ? "sm" : "default"} onClick={() => navigate('/celebrity-notifications')}>
                  <Bell className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">Notifications</span>
                </Button>
                <Button variant="secondary" size={isMobile ? "sm" : "default"} onClick={() => navigate('/celebrity-settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={async () => {
                  await signOut();
                }}>
                  <span className="hidden md:inline">Sign Out</span>
                  <span className="md:hidden">Logout</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Consent Alert */}
        {celebrity && celebrity.consent_status !== 'submitted' && celebrity.consent_status !== 'approved' && (
          <Alert className="mb-6 border-orange-500 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Action Required:</strong> You must submit consent to be displayed to users. Please go to the Consent tab to complete this step.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-lg md:text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</p>
                </div>
                <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                  <p className="text-lg md:text-2xl font-bold">₹{stats.pendingEarnings.toLocaleString()}</p>
                </div>
                <Wallet className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.totalBookings}</p>
                </div>
                <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Rating</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.rating}</p>
                </div>
                <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Reviews</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.reviewCount}</p>
                </div>
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide h-auto">
            <TabsTrigger value="content" className="flex-shrink-0 text-xs sm:text-sm">Content</TabsTrigger>
            <TabsTrigger value="wallet" className="flex-shrink-0 text-xs sm:text-sm">Wallet</TabsTrigger>
            <TabsTrigger value="messages" className="flex-shrink-0 text-xs sm:text-sm">Messages</TabsTrigger>
            <TabsTrigger value="events" className="flex-shrink-0 text-xs sm:text-sm">Events</TabsTrigger>
            <TabsTrigger value="consent" className="flex-shrink-0 text-xs sm:text-sm">Consent</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-shrink-0 text-xs sm:text-sm">Bookings</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-shrink-0 text-xs sm:text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="followers" className="flex-shrink-0 text-xs sm:text-sm">Followers</TabsTrigger>
            <TabsTrigger value="tds" className="flex-shrink-0 text-xs sm:text-sm">TDS</TabsTrigger>
            <TabsTrigger value="profile" className="flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avatar Creation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="w-5 h-5" />
                    <span>Avatar Creation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">Upload photos to create your AI avatar for personalized messages</p>
                  
                  {/* Display current avatar if exists */}
                  {celebrity?.image_url && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Current Avatar:</p>
                      <img 
                        src={celebrity.image_url} 
                        alt="Avatar" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                      />
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Upload Avatar Photos</p>
                    <p className="text-sm text-muted-foreground mb-4">Upload 10-20 high-quality photos for best results</p>
                    <Button onClick={handleAvatarUploadClick} disabled={uploading}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Choose Photos'}
                    </Button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAvatarFiles(e.target.files)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <p className="flex items-center">
                      <Mic className="w-4 h-4 mr-2 text-blue-600" />
                      <strong>Live Consent Required:</strong> By uploading, you consent to AI processing of your photos for avatar creation
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Ad Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="w-5 h-5" />
                    <span>Promotional Content</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">Upload photos and videos for AI-generated promotional content</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Ad Photos</p>
                      <Button size="sm" className="mt-2" onClick={handlePromoPhotoUploadClick} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                      <input
                        ref={promoPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handlePromoFile(e.target.files[0], 'photo')}
                      />
                    </div>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Video Content</p>
                      <Button size="sm" className="mt-2" onClick={handlePromoVideoUploadClick} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                      <input
                        ref={promoVideoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handlePromoFile(e.target.files[0], 'video')}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground bg-orange-50 p-3 rounded-lg">
                    <p className="flex items-center">
                      <Mic className="w-4 h-4 mr-2 text-orange-600" />
                      <strong>Live Consent Required:</strong> Audio/video consent recorded for each upload
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <WalletTab celebrityId={celebrity?.id} stats={stats} availableBalance={celebrity?.available_balance || 0} />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            {celebrity?.id ? (
              <MessagesTab celebrityId={celebrity.id} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Sign up as a celebrity to receive messages from fans.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <CelebrityContentManager />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={profile?.first_name || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={profile?.last_name || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={profile?.email || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <input 
                      type="tel" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={profile?.phone || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Celebrity Name</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={celebrity?.name || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={celebrity?.category || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={celebrity?.date_of_birth || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Anniversary Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                      value={celebrity?.anniversary_date || ''}
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <textarea 
                    className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                    rows={4}
                    value={celebrity?.bio || ''}
                    readOnly
                  />
                </div>

                {/* Service Prices Section */}
                <div className="space-y-4 mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold">Service Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">General Wish Price</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={`₹${celebrity?.service_prices?.general_wish?.toLocaleString() || '0'}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Text Message Price</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={`₹${celebrity?.service_prices?.text_message?.toLocaleString() || '0'}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Image Promotion Price</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={`₹${celebrity?.service_prices?.image_promotion?.toLocaleString() || '0'}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Video Promotion Price</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={`₹${celebrity?.service_prices?.video_promotion?.toLocaleString() || '0'}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Commission Percentage</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={`${celebrity?.commission_percentage || 70}%`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Delivery Time</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                        value={celebrity?.delivery_time || '24 hours'}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media Section */}
                {celebrity?.social_media && (
                  <div className="space-y-4 mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold">Social Media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {celebrity?.social_media?.instagram && (
                        <div>
                          <label className="text-sm font-medium">Instagram</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.instagram}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.youtube && (
                        <div>
                          <label className="text-sm font-medium">YouTube</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.youtube}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.twitter && (
                        <div>
                          <label className="text-sm font-medium">Twitter</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.twitter}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.tiktok && (
                        <div>
                          <label className="text-sm font-medium">TikTok</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.tiktok}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.facebook && (
                        <div>
                          <label className="text-sm font-medium">Facebook</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.facebook}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.linkedin && (
                        <div>
                          <label className="text-sm font-medium">LinkedIn</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.linkedin}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.website && (
                        <div>
                          <label className="text-sm font-medium">Website</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.website}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.portfolio && (
                        <div>
                          <label className="text-sm font-medium">Portfolio</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.portfolio}
                            readOnly
                          />
                        </div>
                      )}
                      {celebrity?.social_media?.other && (
                        <div>
                          <label className="text-sm font-medium">Other</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg mt-1 bg-muted" 
                            value={celebrity.social_media.other}
                            readOnly
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <input 
                      type="password" 
                      className="w-full p-2 border rounded-lg mt-1"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirm Password</label>
                    <input 
                      type="password" 
                      className="w-full p-2 border rounded-lg mt-1"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? "Changing..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <ReviewsTab celebrityId={celebrity?.id} />
          </TabsContent>

          <TabsContent value="followers" className="space-y-6">
            <FollowersTab celebrityId={celebrity?.id} />
          </TabsContent>

          <TabsContent value="tds" className="space-y-6">
            <TDSReportsTab />
          </TabsContent>

          <TabsContent value="consent" className="space-y-6">
            {/* Current Consent Status */}
            {celebrity && (celebrity.consent_status === 'submitted' || celebrity.consent_status === 'approved') && (
              <Card>
                <CardHeader>
                  <CardTitle>Consent Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={celebrity.consent_status === 'approved' ? 'default' : 'secondary'}>
                        {celebrity.consent_status === 'approved' ? 'Approved' : 'Pending Review'}
                      </Badge>
                      {celebrity.consent_given_at && (
                        <span className="text-sm text-muted-foreground">
                          Submitted on {new Date(celebrity.consent_given_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {celebrity.consent_photo_url && (
                      <div>
                        <p className="text-sm font-medium mb-2">Consent Photo:</p>
                        <img 
                          src={celebrity.consent_photo_url} 
                          alt="Consent" 
                          className="w-48 h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    
                    {celebrity.consent_video_url && (
                      <div>
                        <p className="text-sm font-medium mb-2">Consent Video:</p>
                        <video 
                          src={celebrity.consent_video_url} 
                          controls 
                          className="w-full max-w-md rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Show ConsentCapture only if consent not yet submitted */}
            {celebrity && celebrity.consent_status !== 'submitted' && celebrity.consent_status !== 'approved' && (
              <ConsentCapture 
                celebrityId={celebrity?.id || ""}
                onConsentSubmitted={fetchCelebrityData}
              />
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <BookingsTab celebrityId={celebrity?.id} />
          </TabsContent>
        </Tabs>
      </div>
      <DashboardSwitcher />
    </div>
  );
}