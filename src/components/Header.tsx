import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu, Bell, ChevronDown, X, Wallet, LayoutDashboard,
  Film, Music, Settings, LogOut, Shield, Star, Users,
  Phone, Camera, Megaphone, Briefcase, Heart,
  GraduationCap, Baby, PartyPopper, Sparkles, Crown, Clapperboard,
  Tv, Mic2, Landmark, Gamepad2, MessageCircle, ChevronRight,
  Video, Image, Music2, ClipboardList, CreditCard, Cake, Gem, HeartHandshake,
  LayoutGrid, Plane, Hotel, Bus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import logo from "@/assets/wish-me-logo.png";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageAlert } from "@/components/dashboard/MessageAlert";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const NAV_ICON_COLOR = "#FB6549";

interface HeaderProps {
  showSidebarTrigger?: boolean;
}

// --- Data ---
const celebrityCategories = [
  { label: "Actors", icon: Clapperboard },
  { label: "Singers", icon: Mic2 },
  { label: "Comedians", icon: PartyPopper },
  { label: "Athletes", icon: Gamepad2 },
  { label: "Influencers", icon: Users },
  { label: "YouTubers", icon: Tv },
  { label: "TV Stars", icon: Tv },
  { label: "Musicians", icon: Music },
  { label: "Models", icon: Crown },
  { label: "Politicians", icon: Landmark },
];

const servicesItems: { label: string; icon: LucideIcon; path: string; badge?: string }[] = [
  { label: "All Services", icon: LayoutGrid, path: "/all-services" },
  { label: "Flights", icon: Plane, path: "/travel/flights" },
  { label: "Hotels", icon: Hotel, path: "/travel/hotels" },
  { label: "Bus", icon: Bus, path: "/travel/bus" },
  { label: "My Trips", icon: Plane, path: "/travel/trips" },
  { label: "Video Wishes", icon: Video, path: "/celebrities" },
  { label: "Celebrity Calls", icon: Phone, path: "/celebrity-voice-call" },
  { label: "AI Voice Calls", icon: Mic2, path: "/voice-call-wish" },
  { label: "AI Music", icon: Music, path: "/music-studio" },
  { label: "Greeting Cards", icon: Image, path: "/greeting-cards" },
  { label: "Photo Wish", icon: Camera, path: "/photo-wish" },
  { label: "Wish a Celebrity", icon: Heart, path: "/wish-celebrity" },
  { label: "UGC Ads", icon: Megaphone, path: "/ugc-ads", badge: "Business" },
];

const occasionsItems: { label: string; icon: LucideIcon; param: string }[] = [
  { label: "Birthdays", icon: Cake, param: "birthday" },
  { label: "Anniversaries", icon: Gem, param: "anniversary" },
  { label: "Graduations", icon: GraduationCap, param: "graduation" },
  { label: "Valentine's Day", icon: HeartHandshake, param: "valentines" },
  { label: "Celebrations", icon: PartyPopper, param: "celebration" },
  { label: "Baby Showers", icon: Baby, param: "baby-shower" },
  { label: "Corporate Events", icon: Briefcase, param: "corporate" },
];

const userMenuItems: { label: string; icon: LucideIcon; path: string }[] = [
  { label: "My Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "All Services", icon: LayoutGrid, path: "/all-services" },
  { label: "My Bookings", icon: ClipboardList, path: "/bookings" },
  { label: "My Music", icon: Music2, path: "/my-music" },
  { label: "Wallet", icon: Wallet, path: "/wallet" },
  { label: "DMs", icon: Film, path: "/messages" },
  { label: "Referrals", icon: Users, path: "/referrals" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Plans", icon: CreditCard, path: "/plan" },
];

// --- Hook: scroll state ---
function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { scrolled, scrollProgress };
}

// --- Hook: outside click ---
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// --- Desktop Dropdown ---
function NavDropdown({
  label,
  active,
  children,
  open,
  onToggle,
  wide,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => open && onToggle());

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative",
          active
            ? "text-[hsl(16,100%,60%)]"
            : "text-[hsl(220,15%,70%)] hover:text-white"
        )}
      >
        <span>{label}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          open && "rotate-180"
        )} />
        <span className={cn(
          "absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-transform duration-300 origin-left",
          "bg-gradient-to-r from-[hsl(340,85%,65%)] to-[hsl(16,100%,60%)]",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        )} />
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50",
          "animate-in fade-in-0 slide-in-from-top-2 duration-200",
          wide ? "min-w-[520px]" : "min-w-[240px]"
        )}>
          <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,28%,12%)]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Desktop NavLink ---
function NavLink({ to, label, badge, active }: { to: string; label: string; badge?: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group flex items-center gap-1.5",
        active
          ? "text-[hsl(16,100%,60%)]"
          : "text-[hsl(220,15%,70%)] hover:text-white"
      )}
    >
      <span>{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[hsl(16,100%,60%)] to-[hsl(340,85%,65%)] text-white leading-none">
          {badge}
        </span>
      )}
      <span className={cn(
        "absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-transform duration-300 origin-left",
        "bg-gradient-to-r from-[hsl(340,85%,65%)] to-[hsl(16,100%,60%)]",
        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
      )} />
    </Link>
  );
}

// --- Mobile Accordion Section ---
function MobileAccordion({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="animate-in slide-in-from-right-4 fade-in-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-base font-semibold text-white/90 hover:text-white transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-3 space-y-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

// ============ MAIN HEADER ============
const Header = ({ showSidebarTrigger = false }: HeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const { balance } = useWalletBalance();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { scrolled, scrollProgress } = useScrollState();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCelebrity, setIsCelebrity] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(profileMenuRef, () => setProfileMenuOpen(false));

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (user) {
      loadUserRole();
      checkCelebrityStatus();
    }
  }, [user, profile]);

  const loadUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (data) setUserRole(data.role);
  };

  const checkCelebrityStatus = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("celebrities")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    setIsCelebrity(!!data);
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    await signOut();
  };

  const go = useCallback((path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setProfileMenuOpen(false);
  }, [navigate]);

  const isActive = (path: string) => location.pathname === path;

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  // ========== MOBILE ==========
  if (isMobile) {
    return (
      <>
        <header className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[60px] flex items-center",
        )}
          style={{
            background: scrolled
              ? "rgba(10, 10, 26, 0.95)"
              : "rgba(10, 10, 26, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(16,100%,60%)] to-transparent opacity-40" />

          <div className="flex items-center justify-between px-4 w-full">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(16,100%,60%)] via-[hsl(340,85%,65%)] to-[hsl(280,90%,65%)] p-[2px] shadow-lg transition-shadow group-hover:shadow-[0_0_20px_hsl(16,100%,60%,0.4)]">
                <div className="w-full h-full rounded-[10px] bg-[hsl(222,28%,10%)] overflow-hidden">
                  <img src={logo} alt="WishMe" className="w-full h-full object-cover" />
                </div>
              </div>
            </Link>

            {/* Center: Book Now CTA */}
            <Button
              size="sm"
              className="h-8 px-4 rounded-full text-xs font-bold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, hsl(16,100%,60%), hsl(340,85%,65%), hsl(280,90%,65%))",
                boxShadow: "0 0 16px hsl(16,100%,60%,0.35)",
              }}
              onClick={() => go("/celebrities")}
            >
              <Sparkles className="h-3 w-3 mr-1" color="#ffffff" />
              Book Now
            </Button>

            {/* Right: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl text-white/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen
                ? <X className="h-6 w-6" color={NAV_ICON_COLOR} />
                : <Menu className="h-6 w-6" color={NAV_ICON_COLOR} />
              }
            </button>
          </div>

          {/* Scroll progress */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-[hsl(16,100%,60%)] via-[hsl(340,85%,65%)] to-[hsl(280,90%,65%)]"
              style={{ width: `${scrollProgress * 100}%`, transition: "width 100ms linear" }}
            />
          </div>
        </header>

        {/* Mobile overlay menu */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[49] pt-16 animate-in slide-in-from-right duration-300"
            style={{
              background: "rgba(10, 10, 26, 0.98)",
              backdropFilter: "blur(24px)",
            }}
            onTouchStart={(e) => {
              (e.currentTarget as any)._touchStartX = e.touches[0].clientX;
              (e.currentTarget as any)._swiping = false;
            }}
            onTouchMove={(e) => {
              const startX = (e.currentTarget as any)._touchStartX;
              if (startX == null) return;
              const delta = e.touches[0].clientX - startX;
              if (delta > 10) {
                (e.currentTarget as any)._swiping = true;
                e.currentTarget.style.transition = "none";
                e.currentTarget.style.transform = `translateX(${Math.max(0, delta)}px)`;
                e.currentTarget.style.opacity = `${Math.max(0, 1 - delta / 300)}`;
              }
            }}
            onTouchEnd={(e) => {
              const startX = (e.currentTarget as any)._touchStartX;
              if (startX == null || !(e.currentTarget as any)._swiping) return;
              const delta = (e.currentTarget as any)._lastTouchX - startX;
              if (delta > 80) {
                e.currentTarget.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
                e.currentTarget.style.transform = "translateX(100%)";
                e.currentTarget.style.opacity = "0";
                setTimeout(() => setMobileMenuOpen(false), 200);
              } else {
                e.currentTarget.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
                e.currentTarget.style.transform = "";
                e.currentTarget.style.opacity = "";
              }
            }}
            onTouchMoveCapture={(e) => {
              (e.currentTarget as any)._lastTouchX = e.touches[0].clientX;
            }}
          >
            <div className="h-full overflow-y-auto pb-24">
              {/* Logged-in user card */}
              {user && profile && (
                <div
                  className="mx-4 mt-4 mb-3 p-4 rounded-2xl border border-white/[0.06] animate-in fade-in-0 slide-in-from-right-4 duration-300"
                  style={{ background: "linear-gradient(135deg, hsl(222,28%,16%), hsl(222,28%,12%))" }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-[hsl(16,100%,60%)]/30">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-[hsl(16,100%,60%)]/20 text-[hsl(16,100%,60%)] font-semibold">
                        {profile.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "User"}
                      </p>
                      <p className="text-xs text-white/50 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => go("/wallet")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: balance > 0
                          ? "linear-gradient(135deg, hsl(142,70%,20%), hsl(142,70%,15%))"
                          : "hsl(222,28%,20%)",
                        color: balance > 0 ? "hsl(142,70%,65%)" : "hsl(220,15%,60%)",
                        boxShadow: balance > 0 ? "0 0 12px hsl(142,70%,40%,0.2)" : "none",
                      }}
                    >
                      <Wallet className="h-3 w-3" color={NAV_ICON_COLOR} />
                      ₹{balance}
                    </button>
                  </div>
                </div>
              )}

              {/* Role-based dashboard shortcuts */}
              {user && (userRole === "admin" || isCelebrity) && (
                <div className="mx-4 mb-3 space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-300" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
                  {userRole === "admin" && (
                    <button
                      onClick={() => go("/admin")}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, hsl(16,100%,55%), hsl(340,85%,60%))",
                        boxShadow: "0 4px 20px hsl(16,100%,60%,0.3)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        <span>Admin Dashboard</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    </button>
                  )}
                  {isCelebrity && (
                    <button
                      onClick={() => go("/celebrity-dashboard")}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, hsl(280,90%,55%), hsl(260,80%,60%))",
                        boxShadow: "0 4px 20px hsl(280,90%,60%,0.3)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Star className="h-4 w-4 text-white" />
                        </div>
                        <span>Celebrity Dashboard</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    </button>
                  )}
                </div>
              )}

              {/* Nav sections */}
              <MobileAccordion title="Celebrities" delay={100}>
                {celebrityCategories.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => go(`/celebrities?category=${cat.label}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <cat.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                    {cat.label}
                  </button>
                ))}
                <button
                  onClick={() => go("/celebrities")}
                  className="w-full text-left px-3 py-2.5 text-sm font-semibold text-[hsl(16,100%,60%)] hover:text-[hsl(16,100%,70%)] transition-colors"
                >
                  View All Celebrities →
                </button>
              </MobileAccordion>

              <MobileAccordion title="Services" delay={150}>
                {servicesItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(16,100%,60%)]/20 text-[hsl(16,100%,60%)]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </MobileAccordion>

              <MobileAccordion title="Occasions" delay={200}>
                {occasionsItems.map((item) => (
                  <button
                    key={item.param}
                    onClick={() => go(`/celebrities?occasion=${item.param}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                    {item.label}
                  </button>
                ))}
              </MobileAccordion>

              {[
                { label: "Pricing", path: "/pricing", delay: 250 },
                { label: "For Business", path: "/business", delay: 300, badge: "NEW" },
              ].map((item) => (
                <div
                  key={item.path}
                  className="animate-in slide-in-from-right-4 fade-in-0"
                  style={{ animationDelay: `${item.delay}ms`, animationFillMode: "both" }}
                >
                  <button
                    onClick={() => go(item.path)}
                    className="w-full flex items-center gap-2 px-5 py-4 text-base font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    {item.label}
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[hsl(16,100%,60%)] to-[hsl(340,85%,65%)] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </div>
              ))}

              {/* Quick links grid */}
              {user && (
                <div
                  className="border-t border-white/[0.06] mt-3 pt-4 mx-4 animate-in fade-in-0"
                  style={{ animationDelay: "350ms", animationFillMode: "both" }}
                >
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-1">Quick Access</p>
                  <div className="grid grid-cols-4 gap-2">
                    {userMenuItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.04] transition-all active:scale-95"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                          <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom actions */}
              <div className="px-5 mt-6 space-y-3 animate-in fade-in-0" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-white/10 text-white/70 hover:text-white hover:bg-white/[0.06]"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" color={NAV_ICON_COLOR} /> Logout
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl border-white/10 text-white/80 hover:text-white hover:bg-white/[0.06]"
                      onClick={() => go("/auth")}
                    >
                      Login
                    </Button>
                    <Button
                      className="w-full h-12 rounded-xl font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, hsl(16,100%,60%), hsl(340,85%,65%), hsl(16,100%,60%))",
                        backgroundSize: "200% auto",
                        boxShadow: "0 0 24px hsl(16,100%,60%,0.35)",
                      }}
                      onClick={() => go("/auth")}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ========== DESKTOP ==========
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "py-2" : "py-3"
      )}
      style={{
        background: scrolled
          ? "rgba(10, 10, 26, 0.95)"
          : "rgba(10, 10, 26, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {/* Top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(16,100%,60%)] to-transparent opacity-40" />

      <div className="container flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          {showSidebarTrigger && user && (
            <SidebarTrigger className="h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]" />
          )}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(16,100%,60%)] via-[hsl(340,85%,65%)] to-[hsl(280,90%,65%)] p-[2px] shadow-lg transition-all duration-300 group-hover:shadow-[0_0_24px_hsl(16,100%,60%,0.5)]">
              <div className="w-full h-full rounded-[10px] bg-[hsl(222,28%,10%)] overflow-hidden">
                <img src={logo} alt="WishMe" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
              Wish<span className="bg-gradient-to-r from-[hsl(16,100%,60%)] to-[hsl(340,85%,65%)] bg-clip-text text-transparent">Me</span>
            </span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {/* Celebrities dropdown */}
          <NavDropdown
            label="Celebrities"
            active={isActive("/celebrities")}
            open={openDropdown === "celebrities"}
            onToggle={() => toggleDropdown("celebrities")}
            wide
          >
            <div className="p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Browse by Category</p>
              <div className="grid grid-cols-2 gap-1.5">
                {celebrityCategories.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => go(`/celebrities?category=${cat.label}`)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-[hsl(16,100%,60%)]/10 transition-colors">
                      <cat.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                    </div>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => go("/celebrities")}
                  className="text-sm font-semibold text-[hsl(16,100%,60%)] hover:text-[hsl(16,100%,70%)] transition-colors"
                >
                  View All Celebrities →
                </button>
              </div>
            </div>
          </NavDropdown>

          {/* Services dropdown */}
          <NavDropdown
            label="Services"
            active={false}
            open={openDropdown === "services"}
            onToggle={() => toggleDropdown("services")}
          >
            <div className="py-2">
              {servicesItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-150 group"
                >
                  <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(16,100%,60%)]/15 text-[hsl(16,100%,60%)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </NavDropdown>

          {/* Occasions dropdown */}
          <NavDropdown
            label="Occasions"
            active={false}
            open={openDropdown === "occasions"}
            onToggle={() => toggleDropdown("occasions")}
          >
            <div className="py-2">
              {occasionsItems.map((item) => (
                <button
                  key={item.param}
                  onClick={() => go(`/celebrities?occasion=${item.param}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-150"
                >
                  <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                  {item.label}
                </button>
              ))}
            </div>
          </NavDropdown>

          <NavLink to="/pricing" label="Pricing" active={isActive("/pricing")} />
          <NavLink to="/business" label="For Business" badge="NEW" active={isActive("/business")} />
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Wallet pill */}
              <button
                onClick={() => go("/wallet")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 hover:scale-105"
                style={{
                  background: balance > 0
                    ? "linear-gradient(135deg, hsl(142,70%,18%), hsl(142,70%,14%))"
                    : "hsl(222,28%,18%)",
                  color: balance > 0 ? "hsl(142,70%,65%)" : "hsl(220,15%,60%)",
                  border: `1px solid ${balance > 0 ? "hsl(142,70%,30%,0.3)" : "hsl(220,15%,25%)"}`,
                  boxShadow: balance > 0 ? "0 0 16px hsl(142,70%,40%,0.15)" : "none",
                }}
              >
                <Wallet className="h-3.5 w-3.5" color={NAV_ICON_COLOR} />
                ₹{balance}
              </button>

              {/* Notifications bell */}
              <button
                onClick={() => go("/messages")}
                className="relative h-9 w-9 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <Bell className="h-5 w-5" color={NAV_ICON_COLOR} />
                <div className="absolute -top-0.5 -right-0.5">
                  <MessageAlert />
                </div>
              </button>

              {/* Profile dropdown */}
              <div ref={profileMenuRef} className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  <Avatar className="h-7 w-7 border border-white/10">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-xs bg-[hsl(16,100%,60%)]/15 text-[hsl(16,100%,60%)] font-semibold">
                      {profile?.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white/80 hidden sm:block">
                    {profile?.first_name || "Account"}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-white/40 transition-transform duration-200", profileMenuOpen && "rotate-180")} />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,28%,12%)]/95 backdrop-blur-xl shadow-2xl overflow-hidden py-2">
                      {userMenuItems.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => go(item.path)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <item.icon className="h-4 w-4" color={NAV_ICON_COLOR} />
                          {item.label}
                        </button>
                      ))}

                      {(isCelebrity || userRole === "admin") && (
                        <div className="border-t border-white/[0.06] my-1" />
                      )}
                      {isCelebrity && (
                        <button
                          onClick={() => go("/celebrity-dashboard")}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(280,90%,70%)] hover:text-[hsl(280,90%,80%)] hover:bg-white/[0.06] transition-colors"
                        >
                          <Star className="h-4 w-4" color={NAV_ICON_COLOR} /> Celebrity Dashboard
                        </button>
                      )}
                      {userRole === "admin" && (
                        <button
                          onClick={() => go("/admin")}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(16,100%,65%)] hover:text-[hsl(16,100%,75%)] hover:bg-white/[0.06] transition-colors"
                        >
                          <Shield className="h-4 w-4" color={NAV_ICON_COLOR} /> Admin Panel
                        </button>
                      )}

                      <div className="border-t border-white/[0.06] my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors"
                      >
                        <LogOut className="h-4 w-4" color={NAV_ICON_COLOR} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/[0.06]"
                onClick={() => navigate("/auth")}
              >
                Login
              </Button>
              <Button
                size="sm"
                className="rounded-xl font-bold text-white px-5 relative overflow-hidden transition-all duration-300 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, hsl(16,100%,60%), hsl(340,85%,65%), hsl(16,100%,60%))",
                  backgroundSize: "200% auto",
                  boxShadow: "0 0 20px hsl(16,100%,60%,0.35)",
                  animation: "ctaGlow 3s ease-in-out infinite",
                }}
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-[hsl(16,100%,60%)] via-[hsl(340,85%,65%)] to-[hsl(280,90%,65%)]"
          style={{ width: `${scrollProgress * 100}%`, transition: "width 100ms linear" }}
        />
      </div>
    </header>
  );
};

export default Header;
