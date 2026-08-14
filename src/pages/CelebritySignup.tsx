import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { supabase } from "@/integrations/supabase/client";
import { Star, Upload, Instagram, Youtube, Twitter, CheckCircle, TrendingUp, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Category {
  id: string;
  name: string;
}

const benefits = [
  {
    icon: TrendingUp,
    title: "Earn Extra Income",
    description: "Monetize your fame and connect with fans while earning substantial income"
  },
  {
    icon: Users,
    title: "Connect with Fans",
    description: "Build deeper relationships with your audience through personalized messages"
  },
  {
    icon: Star,
    title: "Flexible Schedule",
    description: "Work on your own time and accept only the requests you want"
  }
];

export default function CelebritySignup() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: ""
    },
    professionalInfo: {
      stageName: "",
      category: "",
      bio: "",
      achievements: ""
    },
    socialMedia: {
      instagram: "",
      youtube: "",
      twitter: "",
      tiktok: "",
      facebook: "",
      linkedin: "",
      website: "",
      other: ""
    },
    pricing: {
      personalVideo: "",
      businessVideo: "",
      textMessage: ""
    },
    verification: {
      idDocument: null,
      portfolioLink: "",
      agreeToTerms: false,
      agreeToBackground: false,
      agreeToMarketing: false
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrity_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleInputChange = (section: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (isMobile = false) => {
    setLoading(true);
    try {
      // Get form values
      const firstName = isMobile 
        ? (document.getElementById('mobileFirstName') as HTMLInputElement)?.value
        : (document.getElementById('firstName') as HTMLInputElement)?.value;
      const lastName = isMobile 
        ? (document.getElementById('mobileLastName') as HTMLInputElement)?.value
        : (document.getElementById('lastName') as HTMLInputElement)?.value;
      const email = isMobile 
        ? (document.getElementById('mobileEmail') as HTMLInputElement)?.value
        : (document.getElementById('email') as HTMLInputElement)?.value;
      const phone = isMobile 
        ? (document.getElementById('mobilePhone') as HTMLInputElement)?.value
        : (document.getElementById('phone') as HTMLInputElement)?.value;
      const dateOfBirth = isMobile 
        ? (document.getElementById('mobileDob') as HTMLInputElement)?.value
        : (document.getElementById('dob') as HTMLInputElement)?.value;
      const stageName = isMobile 
        ? (document.getElementById('mobileStageName') as HTMLInputElement)?.value
        : (document.getElementById('stageName') as HTMLInputElement)?.value;
      const bio = isMobile 
        ? (document.getElementById('mobileBio') as HTMLTextAreaElement)?.value
        : (document.getElementById('bio') as HTMLTextAreaElement)?.value;
      const portfolio = isMobile 
        ? (document.getElementById('mobilePortfolio') as HTMLInputElement)?.value
        : (document.getElementById('portfolio') as HTMLInputElement)?.value;
      const instagram = isMobile 
        ? "" 
        : (document.getElementById('instagram') as HTMLInputElement)?.value;
      const youtube = isMobile 
        ? "" 
        : (document.getElementById('youtube') as HTMLInputElement)?.value;
      const twitter = isMobile 
        ? "" 
        : (document.getElementById('twitter') as HTMLInputElement)?.value;
      const tiktok = isMobile 
        ? "" 
        : (document.getElementById('tiktok') as HTMLInputElement)?.value;
      const facebook = isMobile 
        ? "" 
        : (document.getElementById('facebook') as HTMLInputElement)?.value;
      const linkedin = isMobile 
        ? "" 
        : (document.getElementById('linkedin') as HTMLInputElement)?.value;
      const website = isMobile 
        ? "" 
        : (document.getElementById('website') as HTMLInputElement)?.value;
      const otherSocial = isMobile 
        ? "" 
        : (document.getElementById('otherSocial') as HTMLInputElement)?.value;
      const termsChecked = isMobile 
        ? (document.getElementById('mobileTerms') as HTMLInputElement)?.checked
        : (document.getElementById('terms') as HTMLInputElement)?.checked;
      const backgroundChecked = isMobile 
        ? (document.getElementById('mobileBackground') as HTMLInputElement)?.checked
        : (document.getElementById('background') as HTMLInputElement)?.checked;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !stageName || !bio || !termsChecked || !backgroundChecked) {
        toast.error('Please fill in all required fields and accept the terms');
        return;
      }

      // Check if email already has application
      const { data: existingApp } = await supabase
        .from('celebrity_applications')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();
        
      if (existingApp) {
        if (existingApp.status === 'pending') {
          toast.error('You already have a pending application. Please wait for admin approval.');
        } else if (existingApp.status === 'approved') {
          toast.error('You already have an approved celebrity account. Please sign in.');
        } else {
          toast.error('Your previous application was rejected. Please contact support.');
        }
        return;
      }

      // Create celebrity application (no user account yet)
      const { error: applicationError } = await supabase
        .from('celebrity_applications')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          date_of_birth: dateOfBirth || null,
          stage_name: stageName,
          category: 'Actor/Actress',
          bio: bio,
          portfolio_link: portfolio || null,
          social_media: {
            instagram: instagram || '',
            youtube: youtube || '',
            twitter: twitter || '',
            tiktok: tiktok || '',
            facebook: facebook || '',
            linkedin: linkedin || '',
            website: website || '',
            other: otherSocial || ''
          }
        });

      if (applicationError) throw applicationError;

      toast.success('Application submitted successfully! Admin will review and create your account.');
      
      // Redirect to home after success
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const fillSampleData = () => {
    // Generate unique email and phone for testing
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    
    // Desktop form
    const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
    const lastNameInput = document.getElementById('lastName') as HTMLInputElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const phoneInput = document.getElementById('phone') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const dobInput = document.getElementById('dob') as HTMLInputElement;
    const stageNameInput = document.getElementById('stageName') as HTMLInputElement;
    const bioInput = document.getElementById('bio') as HTMLTextAreaElement;
    const personalVideoInput = document.getElementById('personalVideo') as HTMLInputElement;
    const businessVideoInput = document.getElementById('businessVideo') as HTMLInputElement;
    const textMessageInput = document.getElementById('textMessage') as HTMLInputElement;
    const portfolioInput = document.getElementById('portfolio') as HTMLInputElement;
    const instagramInput = document.getElementById('instagram') as HTMLInputElement;
    const youtubeInput = document.getElementById('youtube') as HTMLInputElement;
    const twitterInput = document.getElementById('twitter') as HTMLInputElement;
    const tiktokInput = document.getElementById('tiktok') as HTMLInputElement;
    
    if (firstNameInput) firstNameInput.value = 'John';
    if (lastNameInput) lastNameInput.value = 'Doe';
    if (emailInput) emailInput.value = `john.doe.${timestamp}.${randomNum}@example.com`;
    if (phoneInput) phoneInput.value = `+91 ${9876543210 + randomNum}`;
    if (passwordInput) passwordInput.value = 'Test123!';
    if (dobInput) dobInput.value = '1990-01-15';
    if (stageNameInput) stageNameInput.value = `Johnny Star ${randomNum}`;
    if (bioInput) bioInput.value = 'Professional actor with 10+ years experience in film and television. Known for versatile performances and strong screen presence.';
    if (portfolioInput) portfolioInput.value = 'https://portfolio-example.com/johndoe';
    if (instagramInput) instagramInput.value = '@johnnystar';
    if (youtubeInput) youtubeInput.value = 'Johnny Star Official';
    if (twitterInput) twitterInput.value = '@johnnystar90';
    if (tiktokInput) tiktokInput.value = '@johnnystar';
    
    // Check terms
    const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
    const backgroundCheckbox = document.getElementById('background') as HTMLInputElement;
    if (termsCheckbox) termsCheckbox.checked = true;
    if (backgroundCheckbox) backgroundCheckbox.checked = true;
    
    toast.success('Sample data filled! Email and phone are unique for testing.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Mobile Native Design */}
      <div className="md:hidden mobile-safe-bottom">
        <div className="pt-16 pb-8 px-4">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold leading-tight">
              <span className="text-foreground">Join as a</span>
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">Celebrity</span>
            </h1>
            <p className="text-muted-foreground text-sm px-2">
              Turn your influence into income. Connect with fans and earn money
            </p>
          </div>
        </div>

        {/* Mobile Benefits */}
        <div className="px-4 pb-6">
          <h2 className="text-xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Why Join?
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="mobile-card p-4">
                <div className="flex items-start space-x-3">
                  <benefit.icon className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Application Form */}
        <div className="px-4 pb-6">
          <div className="mobile-card p-6">
            <h2 className="text-xl font-bold mb-4">Complete Application</h2>
            <div className="space-y-6">
              
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="mobileFirstName">First Name *</Label>
                    <Input id="mobileFirstName" placeholder="Your first name" required />
                  </div>
                  <div>
                    <Label htmlFor="mobileLastName">Last Name *</Label>
                    <Input id="mobileLastName" placeholder="Your last name" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mobileEmail">Email Address *</Label>
                  <Input id="mobileEmail" type="email" placeholder="your@email.com" required />
                </div>
                <div>
                  <Label htmlFor="mobilePhone">Phone Number *</Label>
                  <Input id="mobilePhone" type="tel" placeholder="+91 98765 43210" required />
                </div>
                <div>
                  <Label htmlFor="mobileDob">Date of Birth *</Label>
                  <Input id="mobileDob" type="date" required />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Info</h3>
                <div>
                  <Label htmlFor="mobileStageName">Stage Name *</Label>
                  <Input id="mobileStageName" placeholder="How fans know you" required />
                </div>
                <div>
                  <Label htmlFor="mobileCategory">Category *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mobileBio">Professional Bio *</Label>
                  <Textarea id="mobileBio" placeholder="Tell us about your career and achievements..." className="min-h-[100px]" required />
                </div>
                <div>
                  <Label htmlFor="mobileAchievements">Key Achievements</Label>
                  <Textarea id="mobileAchievements" placeholder="Awards, recognitions, notable works..." className="min-h-[80px]" />
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Media</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <Instagram className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Instagram @username" className="pl-10" />
                  </div>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="YouTube channel" className="pl-10" />
                  </div>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Twitter @username" className="pl-10" />
                  </div>
                </div>
              </div>

              {/* Pricing Note */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Service pricing will be set by our admin team based on your profile and market rates. You'll be notified once your pricing is configured.
                </p>
              </div>

              {/* Verification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Verification</h3>
                <div>
                  <Label htmlFor="mobilePortfolio">Portfolio Link</Label>
                  <Input id="mobilePortfolio" placeholder="Link to your work samples" />
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload Government ID</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="mobileTerms" className="mt-1" />
                  <Label htmlFor="mobileTerms" className="text-xs leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>,{" "}
                    <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>, and{" "}
                    <a href="/celebrity-agreement" target="_blank" className="text-primary hover:underline">Celebrity Agreement</a>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="mobileBackground" className="mt-1" />
                  <Label htmlFor="mobileBackground" className="text-xs leading-relaxed">
                    I consent to background verification and identity confirmation
                  </Label>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-primary hover:bg-primary-dark text-primary-foreground py-3"
                onClick={() => {
                  // Generate unique email and phone for testing
                  const timestamp = Date.now();
                  const randomNum = Math.floor(Math.random() * 1000);
                  
                  // Auto-fill with sample data for testing (excluding email and phone for uniqueness)
                  const firstNameInput = document.getElementById('mobileFirstName') as HTMLInputElement;
                  const lastNameInput = document.getElementById('mobileLastName') as HTMLInputElement;
                  const emailInput = document.getElementById('mobileEmail') as HTMLInputElement;
                  const phoneInput = document.getElementById('mobilePhone') as HTMLInputElement;
                  const passwordInput = document.getElementById('mobilePassword') as HTMLInputElement;
                  const dobInput = document.getElementById('mobileDob') as HTMLInputElement;
                  const stageNameInput = document.getElementById('mobileStageName') as HTMLInputElement;
                  const bioInput = document.getElementById('mobileBio') as HTMLTextAreaElement;
                  const portfolioInput = document.getElementById('mobilePortfolio') as HTMLInputElement;
                  
                  if (firstNameInput) firstNameInput.value = 'John';
                  if (lastNameInput) lastNameInput.value = 'Doe';
                  if (emailInput) emailInput.value = `john.doe.${timestamp}.${randomNum}@example.com`;
                  if (phoneInput) phoneInput.value = `+91 ${9876543210 + randomNum}`;
                  if (passwordInput) passwordInput.value = 'Test123!';
                  if (dobInput) dobInput.value = '1990-01-15';
                  if (stageNameInput) stageNameInput.value = `Johnny Star ${randomNum}`;
                  if (bioInput) bioInput.value = 'Professional actor with 10+ years experience in film and television. Known for versatile performances and strong screen presence.';
                  if (portfolioInput) portfolioInput.value = 'https://portfolio-example.com/johndoe';
                  
                  // Check terms
                  const termsCheckbox = document.getElementById('mobileTerms') as HTMLInputElement;
                  const backgroundCheckbox = document.getElementById('mobileBackground') as HTMLInputElement;
                  if (termsCheckbox) termsCheckbox.checked = true;
                  if (backgroundCheckbox) backgroundCheckbox.checked = true;
                  
                  toast.success('Sample data filled! Email and phone are unique for testing.');
                }}
                disabled={loading}
              >
                🚀 Fill Sample Data
              </Button>
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Complete Application'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Design */}
      <div className="hidden md:block">
        <div className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="text-foreground">Join as a </span>
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Celebrity
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Turn your influence into income. Connect with fans, create memorable moments, 
              and earn money by sharing personalized messages.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-card transition-all duration-300">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center">
                    <benefit.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Celebrity Application</CardTitle>
              <CardDescription>
                Please fill out all sections to apply. Our team will review your application within 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" placeholder="Your first name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" placeholder="Your last name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" type="tel" placeholder="+91 98765 43210" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input id="dob" type="date" required />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stageName">Stage/Professional Name *</Label>
                    <Input id="stageName" placeholder="How fans know you" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your category" />
                      </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio *</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell us about your career, achievements, and what makes you unique..." 
                    className="min-h-[100px]"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achievements">Key Achievements</Label>
                  <Textarea 
                    id="achievements" 
                    placeholder="Awards, recognitions, notable works, follower milestones..." 
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Social Media Presence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram Handle</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="instagram" placeholder="@yourusername" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube Channel</Label>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="youtube" placeholder="Channel name or URL" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X Handle</Label>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="twitter" placeholder="@yourusername" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok Handle</Label>
                    <div className="relative">
                      <Video className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="tiktok" placeholder="@yourusername" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook Page</Label>
                    <Input id="facebook" placeholder="Page name or URL" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input id="linkedin" placeholder="Profile URL" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website/Portfolio</Label>
                    <Input id="website" placeholder="https://your-website.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherSocial">Other Social Media</Label>
                    <Input id="otherSocial" placeholder="Additional platforms..." />
                  </div>
                </div>
              </div>

              {/* Pricing Note */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Pricing Structure</h3>
                  <p className="text-sm text-muted-foreground">
                    Service pricing will be determined by our admin team based on your profile, experience, and market rates. You'll be notified once your pricing is configured after approval.
                  </p>
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Verification & Portfolio</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio/Work Samples</Label>
                    <Input id="portfolio" placeholder="Link to your best work, demo reel, or portfolio" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idUpload">Government ID Upload *</Label>
                    <Input 
                      id="idUpload" 
                      type="file" 
                      accept="image/*,.pdf"
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a clear image of your government-issued ID (PNG, JPG, or PDF - max 10MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Terms & Agreements</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="terms" className="mt-1" />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      I agree to the{" "}
                      <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>,{" "}
                      <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>, and{" "}
                      <a href="/celebrity-agreement" target="_blank" className="text-primary hover:underline">Celebrity Agreement</a>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="background" className="mt-1" />
                    <Label htmlFor="background" className="text-sm leading-relaxed">
                      I consent to background verification and identity confirmation as part of the application process
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox id="marketing" className="mt-1" />
                    <Label htmlFor="marketing" className="text-sm leading-relaxed">
                      I agree to be featured in Wish Me marketing materials and celebrity directory (optional)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Fill Sample Data Button */}
              <div className="pt-4">
                <Button 
                  className="w-full mb-4" 
                  variant="secondary"
                  onClick={fillSampleData}
                  disabled={loading}
                >
                  🚀 Fill Sample Data
                </Button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button 
                  className="w-full bg-gradient-primary hover:bg-primary-dark text-primary-foreground py-3 text-lg"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Our team will review your application and get back to you within 3-5 business days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>What Happens Next?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <h4 className="font-semibold mb-1">Application Review</h4>
                  <p className="text-sm text-muted-foreground">Our team reviews your profile and social media presence</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <h4 className="font-semibold mb-1">Verification</h4>
                  <p className="text-sm text-muted-foreground">Identity verification and background check completion</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                  <h4 className="font-semibold mb-1">Go Live</h4>
                  <p className="text-sm text-muted-foreground">Profile goes live and you start receiving requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}