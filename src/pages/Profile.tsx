import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { User, Mail, Phone, Calendar, Settings, Camera, LogOut, Shield, CheckCircle2, AlertCircle, MapPin, Building2, CreditCard, Upload, Share2, Copy } from "lucide-react";
import { EnhancedAddressManager } from "@/components/profile/EnhancedAddressManager";
import { BankDetailsManager } from "@/components/profile/BankDetailsManager";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { validatePhone, normalizePhone } from "@/utils/validation";
import { logActivity } from "@/utils/auditLogger";

export default function Profile() {
  const { user, profile, signOut, changePassword } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
    address: "",
    bank_account_number: "",
    bank_name: "",
    bank_ifsc: "",
    bank_account_holder_name: "",
    aadhaar_number: "",
    pan_number: "",
    pan_document_url: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPAN, setUploadingPAN] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        avatar_url: profile.avatar_url || "",
        address: (profile as any).address || "",
        bank_account_number: (profile as any).bank_account_number || "",
        bank_name: (profile as any).bank_name || "",
        bank_ifsc: (profile as any).bank_ifsc || "",
        bank_account_holder_name: (profile as any).bank_account_holder_name || "",
        aadhaar_number: (profile as any).aadhaar_number || "",
        pan_number: (profile as any).pan_number || "",
        pan_document_url: (profile as any).pan_document_url || ""
      });
    }
  }, [profile]);

  const calculateCompletionPercentage = () => {
    if (!profile) return 20;
    
    const fields = [
      profile.first_name,
      profile.last_name,
      profile.phone,
      (profile as any).address,
      (profile as any).bank_account_number,
      (profile as any).bank_name,
      (profile as any).bank_ifsc,
      (profile as any).bank_account_holder_name,
      (profile as any).aadhaar_number,
      (profile as any).pan_number
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== "").length;
    const basePercentage = Math.round((filledFields / fields.length) * 80) + 20;
    
    // Add bonus for verified documents
    let bonusPercentage = 0;
    if ((profile as any).aadhaar_verified) bonusPercentage += 10;
    if ((profile as any).pan_verified) bonusPercentage += 10;
    
    return Math.min(basePercentage + bonusPercentage, 100);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate and normalize phone before saving
    const rawPhone = formData.phone.trim();
    if (rawPhone !== '') {
      const phoneValidation = validatePhone(rawPhone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error);
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: phoneValidation.error
        });
        return;
      }
      // Normalize phone to consistent format before saving
      formData.phone = normalizePhone(rawPhone);
    }
    
    setLoading(true);
    try {
      const completionPercentage = calculateCompletionPercentage();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          address: formData.address,
          bank_account_number: formData.bank_account_number,
          bank_name: formData.bank_name,
          bank_ifsc: formData.bank_ifsc,
          bank_account_holder_name: formData.bank_account_holder_name,
          aadhaar_number: formData.aadhaar_number,
          pan_number: formData.pan_number,
          profile_completion_percentage: completionPercentage
        })
        .eq('user_id', user.id);

      if (error) throw error;

      logActivity({
        action_category: 'profile',
        action_type: 'profile_updated',
        action_label: 'User updated their profile details',
        severity: 'info',
        metadata: { fields_changed: Object.keys(formData).filter(k => (formData as any)[k] !== '') },
      }).catch(() => {});

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
      
      setEditing(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
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

  const handlePANUpload = async (file: File) => {
    if (!user) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 5MB."
      });
      return;
    }

    setUploadingPAN(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/pan_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Update profile with PAN document URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pan_document_url: publicUrl } as any)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, pan_document_url: publicUrl });

      toast({
        title: "PAN document uploaded",
        description: "Your PAN card has been uploaded successfully. Admin will verify it shortly."
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload PAN document. Please try again."
      });
    } finally {
      setUploadingPAN(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      if (!user) throw new Error('User not authenticated');

      // Create a unique filename
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile_${timestamp}.${fileExt}`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

      // Update the avatar URL in the form data
      setFormData(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated successfully."
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again."
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a photo smaller than 5MB."
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file."
        });
        return;
      }
      
      setSelectedFile(file);
      handlePhotoUpload(file);
    }
  };

  const handleKYCRequest = async (documentType: 'aadhaar' | 'pan') => {
    toast({
      title: "KYC Verification",
      description: `${documentType.toUpperCase()} verification request submitted. Admin will review and verify your document.`
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const completionPercentage = calculateCompletionPercentage();

  if (!user || !profile) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const SaveButton = ({ className = "" }: { className?: string }) => (
    <Button 
      onClick={handleSave} 
      disabled={loading || !editing} 
      className={`${className} ${!editing ? 'opacity-50' : ''}`}
    >
      {loading ? "Saving..." : "Save Changes"}
    </Button>
  );

  return (
    <AuthenticatedLayout>
      {isMobile ? (
        /* Mobile View */
        <div className="px-4 pb-28 mobile-safe-bottom space-y-6">
          {/* Top Save Button for Mobile */}
          {editing && (
            <div>
              <SaveButton className="w-full" />
            </div>
          )}

          {/* Profile Avatar & Info */}
          <div className="flex flex-col items-center pt-2">
            <div className="relative">
              <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-primary via-orange-500 to-pink-500">
                <div className="w-full h-full rounded-full bg-background p-[3px]">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={formData.avatar_url || profile.avatar_url || ""} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profile.first_name || "", profile.last_name || "")}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {editing && (
                <label className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploadingPhoto} />
                </label>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            {/* Completion Badge */}
            <div className="mt-[-14px] z-10">
              <Badge className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 text-xs px-3 py-0.5 shadow-md">
                {completionPercentage}% COMPLETE
              </Badge>
            </div>
            <h1 className="text-2xl font-bold mt-3">{profile.first_name} {profile.last_name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>

          {/* IDENTITY DETAILS */}
          <div>
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-3 px-1">Identity Details</h2>
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-5">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Full Name</label>
                {editing ? (
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="First" />
                    <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Last" />
                  </div>
                ) : (
                  <p className="text-base font-medium mt-1">{profile.first_name} {profile.last_name || ''}</p>
                )}
              </div>
              <Separator className="opacity-30" />
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email Address</label>
                <p className="text-base font-medium mt-1">{profile.email}</p>
              </div>
              <Separator className="opacity-30" />
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Phone Number</label>
                {editing ? (
                  <div className="mt-1.5">
                    <Input
                      value={formData.phone}
                      onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setPhoneError(undefined); }}
                      className={phoneError ? 'border-destructive' : ''}
                      placeholder="+91 98765 43210"
                    />
                    {phoneError && <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {phoneError}</p>}
                  </div>
                ) : (
                  <p className="text-base font-medium mt-1">{profile.phone || "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          {/* REFERRAL HUB */}
          <div>
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-3 px-1">Referral Hub</h2>
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">Invite & Earn</p>
                  <p className="text-xs text-muted-foreground">Share your code with friends</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 rounded-full px-4 py-2.5 font-mono text-sm font-bold tracking-wider">
                  {profile?.referral_code || 'Loading...'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    if (profile?.referral_code) {
                      navigator.clipboard.writeText(profile.referral_code);
                      toast({ title: 'Copied!', description: 'Referral code copied' });
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => {
                  if (profile?.referral_url && navigator.share) {
                    navigator.share({ title: 'Join WishMe', url: profile.referral_url });
                  } else if (profile?.referral_url) {
                    navigator.clipboard.writeText(profile.referral_url);
                    toast({ title: 'Copied!', description: 'Referral URL copied' });
                  }
                }}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                </Button>
                <Button size="sm" className="flex-1 rounded-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 border-0">
                  Invite
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Addresses */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden [&>div>div:first-child]:border-0 [&>div>div:first-child]:rounded-none [&>div>div:first-child]:shadow-none [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
            <EnhancedAddressManager />
          </div>

          {/* Bank Accounts */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden [&>div>div:first-child]:border-0 [&>div>div:first-child]:rounded-none [&>div>div:first-child]:shadow-none [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
            <BankDetailsManager />
          </div>

          {/* VERIFICATION STATUS */}
          <div>
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-3 px-1">Verification Status</h2>
            <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/30">
              {/* Aadhaar */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Aadhaar Verification</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Number: {(profile as any).aadhaar_number ? "****" + (profile as any).aadhaar_number.slice(-4) : "Not set"}
                  </p>
                </div>
                <Badge
                  variant={(profile as any).aadhaar_verified ? "default" : "secondary"}
                  className={`shrink-0 text-[10px] px-2.5 py-0.5 ${!(profile as any).aadhaar_verified ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : ''}`}
                >
                  {(profile as any).aadhaar_verified ? "Verified" : "Pending"}
                </Badge>
              </div>
              {/* PAN */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">PAN Verification</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Number: {(profile as any).pan_number || "Not set"}
                  </p>
                </div>
                <Badge
                  variant={(profile as any).pan_verified ? "default" : "secondary"}
                  className={`shrink-0 text-[10px] px-2.5 py-0.5 ${!(profile as any).pan_verified ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : ''}`}
                >
                  {(profile as any).pan_verified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
            {editing && (
              <div className="mt-3 space-y-3 rounded-2xl border border-border/50 bg-card p-5">
                <div className="space-y-2">
                  <Label className="text-xs">Aadhaar Number</Label>
                  <Input value={formData.aadhaar_number} onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })} placeholder="Enter Aadhaar number" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">PAN Number</Label>
                  <Input value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} placeholder="Enter PAN number" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Upload PAN Card</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePANUpload(f); }} disabled={uploadingPAN} />
                  {uploadingPAN && <p className="text-xs text-muted-foreground">Uploading...</p>}
                </div>
              </div>
            )}
          </div>

          {/* ACCOUNT SECURITY */}
          <div>
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-3 px-1">Account Security</h2>
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted/30"
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="w-full rounded-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 border-0 h-12 text-sm font-bold uppercase tracking-wider"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>

          {/* Sign Out */}
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full rounded-full h-12 border-primary/30 text-primary font-bold uppercase tracking-wider text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          {/* App Version */}
          <p className="text-center text-[10px] text-muted-foreground pb-4">
            Member since {new Date((profile as any).created_at).toLocaleDateString()}
          </p>
        </div>
      ) : (
        /* Desktop View */
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Profile Summary */}
            <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src={formData.avatar_url || profile.avatar_url || ""} />
                        <AvatarFallback className="text-2xl">
                          {getInitials(profile.first_name || "", profile.last_name || "")}
                        </AvatarFallback>
                      </Avatar>
                      {editing && (
                        <label className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                          <Camera className="w-5 h-5 text-primary-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={uploadingPhoto}
                          />
                        </label>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                  <h2 className="text-2xl font-bold mb-2">
                    {profile.first_name} {profile.last_name}
                  </h2>
                  <p className="text-muted-foreground mb-4">{profile.email}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Member since {new Date((profile as any).created_at).toLocaleDateString()}
                  </p>
                  
                  {/* Profile Completion */}
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Profile Completion</span>
                      <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Complete your profile to unlock all features
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setEditing(true);
                      document.getElementById('profile-settings')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleSignOut}
                    className="w-full justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Content - Profile Details */}
            <div id="profile-settings" className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Profile Settings</h1>
                <Button
                  variant="outline"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      {editing ? (
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{profile.first_name || "Not set"}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      {editing ? (
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{profile.last_name || "Not set"}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="phone-desktop">Phone Number</Label>
                      {editing ? (
                        <>
                          <Input
                            id="phone-desktop"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData({ ...formData, phone: e.target.value });
                              setPhoneError(undefined);
                            }}
                            className={phoneError ? 'border-destructive' : ''}
                            placeholder="+91 98765 43210"
                          />
                          {phoneError && (
                            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" /> {phoneError}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Enter 10-digit Indian mobile number</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{profile.phone || "Not set"}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    {editing ? (
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter your full address"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{(profile as any).address || "Not set"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name</Label>
                      {editing ? (
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{(profile as any).bank_name || "Not set"}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="bank_account_holder_name">Account Holder Name</Label>
                      {editing ? (
                        <Input
                          id="bank_account_holder_name"
                          value={formData.bank_account_holder_name}
                          onChange={(e) => setFormData({ ...formData, bank_account_holder_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{(profile as any).bank_account_holder_name || "Not set"}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="bank_account_number">Account Number</Label>
                      {editing ? (
                        <Input
                          id="bank_account_number"
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          {(profile as any).bank_account_number ? "****" + (profile as any).bank_account_number.slice(-4) : "Not set"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="bank_ifsc">IFSC Code</Label>
                      {editing ? (
                        <Input
                          id="bank_ifsc"
                          value={formData.bank_ifsc}
                          onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{(profile as any).bank_ifsc || "Not set"}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KYC Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    KYC Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                        <Badge variant={(profile as any).aadhaar_verified ? "default" : "secondary"}>
                          {(profile as any).aadhaar_verified ? (
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
                      {editing ? (
                        <div className="space-y-2">
                          <Input
                            id="aadhaar_number"
                            value={formData.aadhaar_number}
                            onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                            placeholder="Enter Aadhaar number"
                          />
                          {!(profile as any).aadhaar_verified && formData.aadhaar_number && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleKYCRequest('aadhaar')}
                            >
                              Request Verification
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          {(profile as any).aadhaar_number ? "****" + (profile as any).aadhaar_number.slice(-4) : "Not set"}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="pan_number">PAN Number</Label>
                        <Badge variant={(profile as any).pan_verified ? "default" : "secondary"}>
                          {(profile as any).pan_verified ? (
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
                      {editing ? (
                        <div className="space-y-2">
                          <Input
                            id="pan_number"
                            value={formData.pan_number}
                            onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                            placeholder="Enter PAN number"
                          />
                          <div>
                            <Label htmlFor="pan_document" className="text-sm text-muted-foreground">
                              Upload PAN Card (Image or PDF)
                            </Label>
                            <Input
                              id="pan_document"
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handlePANUpload(file);
                                }
                              }}
                              disabled={uploadingPAN}
                              className="mt-1"
                            />
                            {uploadingPAN && (
                              <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                            )}
                          </div>
                          {!(profile as any).pan_verified && formData.pan_number && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleKYCRequest('pan')}
                            >
                              Request Verification
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{(profile as any).pan_number || "Not set"}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {editing && (
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <SaveButton />
                </div>
              )}

              {/* Security Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="desktop-new-password">New Password</Label>
                      <Input
                        id="desktop-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desktop-confirm-password">Confirm Password</Label>
                      <Input
                        id="desktop-confirm-password"
                        type="password"
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

              {/* Bottom Save Button for Mobile */}
              {editing && (
                <div className="mt-6">
                  <SaveButton className="w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}