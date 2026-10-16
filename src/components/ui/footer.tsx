import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Star, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Save to newsletter_subscriptions table
      const { error: subError } = await supabase.from('newsletter_subscriptions').upsert(
        { email, status: 'active', subscribed_at: new Date().toISOString() },
        { onConflict: 'email' }
      );
      if (subError) throw subError;

      // Send welcome notification
      await supabase.functions.invoke('send-wishme-notification', {
        body: {
          event_key: 'newsletter_welcome',
          recipient_type: 'user',
          data: { first_name: 'there', email, recipient_email: email }
        }
      });

      toast({
        title: "Successfully Subscribed! 🎉",
        description: "Check your email for a welcome message from us.",
      });
      setEmail("");
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-muted/30 border-t border-border hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="/wish-me-logo.png" 
                alt="Wish Me Logo" 
                className="w-12 h-12 rounded-lg object-contain"
              />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Wish Me
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create magical moments with celebrity wishes, powerful business campaigns, and AI-generated music. 
              Your dreams, our technology.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="p-2">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Youtube className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/celebrities" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Browse Celebrities
                </Link>
              </li>
              <li>
                <Link to="/business" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Business Solutions
                </Link>
              </li>
              <li>
                <Link to="/ai-music" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  AI Music Studio
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/celebrity-wishes" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Celebrity Wishes
                </Link>
              </li>
              <li>
                <Link to="/business-campaigns" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Business Campaigns
                </Link>
              </li>
              <li>
                <Link to="/ai-music-creation" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  AI Music Creation
                </Link>
              </li>
              <li>
                <Link to="/referral-program" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Referral Program
                </Link>
              </li>
              <li>
                <Link to="/celebrity-signup" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Join as Celebrity
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter & Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
            <p className="text-muted-foreground text-sm">
              Subscribe to get updates on new celebrities and features.
            </p>
            <form onSubmit={handleSubscribe} className="flex space-x-2">
              <Input 
                placeholder="Enter your email" 
                className="flex-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <Button 
                size="sm" 
                className="px-4" 
                type="submit"
                disabled={loading}
              >
                {loading ? "..." : "Subscribe"}
              </Button>
            </form>
            
            <div className="space-y-3 pt-4">
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>support@wishme.today</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Mumbai, India</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/refund-policy" className="hover:text-primary transition-colors">
              Refund Policy
            </Link>
            <Link to="/support" className="hover:text-primary transition-colors">
              Support
            </Link>
          </div>
          
          <div className="text-sm text-muted-foreground">
            powered by ALLACCESS ONLINE SHOPPING AND BUSINESS CONNECT PRIVATE operating as WishMe, All rights reserved.
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center items-center space-x-8 mt-8 pt-8 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded bg-green-500"></div>
            </div>
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
            </div>
            <span>PCI Compliant</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
            </div>
            <span>GDPR Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}