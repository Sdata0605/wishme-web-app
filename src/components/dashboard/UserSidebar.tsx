import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  LayoutGrid,
  Heart,
  Briefcase,
  LogOut,
  Star,
  MessageSquare,
  Send,
  Users,
  Share2,
  Wallet,
  Crown,
  ChevronLeft,
  Settings,
  Music,
  ShoppingBag,
  Image as ImageIcon,
  Bell,
  Phone,
  Wand2,
  Plane,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const userNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "All Services",
    url: "/all-services",
    icon: LayoutGrid,
  },
  {
    title: "My Trips",
    url: "/travel/trips",
    icon: Plane,
  },
  {
    title: "Celebrity Call",
    url: "/celebrity-voice-call",
    icon: Phone,
  },
  {
    title: "AI Voice Call",
    url: "/voice-call-wish",
    icon: Phone,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: Wallet,
  },
  {
    title: "Bookings",
    url: "/bookings",
    icon: ShoppingBag,
  },
  {
    title: "Favorites",
    url: "/following",
    icon: Heart,
  },
  {
    title: "Wish Orders",
    url: "/wish-orders",
    icon: Star,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Loved Ones",
    url: "/loved-ones",
    icon: Heart,
  },
  {
    title: "AI Music",
    url: "/music-studio",
    icon: Music,
  },
  {
    title: "Photo Wish",
    url: "/photo-wish",
    icon: Wand2,
  },
  {
    title: "Wish a Celebrity",
    url: "/wish-celebrity",
    icon: Star,
  },
  {
    title: "Wish a Friend",
    url: "/wish-friend",
    icon: Users,
  },
  {
    title: "For Business",
    url: "/business",
    icon: Briefcase,
  },
  {
    title: "Greeting Cards",
    url: "/greeting-cards",
    icon: Send,
  },
  {
    title: "Image Promotions",
    url: "/image-promotions",
    icon: ImageIcon,
  },
  {
    title: "Browse Celebrities",
    url: "/celebrities",
    icon: Users,
  },
  {
    title: "Referrals",
    url: "/referrals",
    icon: Share2,
  },
  {
    title: "Occasion Alerts",
    url: "/occasion-alerts",
    icon: Bell,
  },
];

export function UserSidebar() {
  const { state, open, setOpen } = useSidebar();
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isCelebrity, setIsCelebrity] = useState(false);
  const isCollapsed = state === "collapsed";

  // Check if user is a celebrity
  useEffect(() => {
    const checkCelebrityStatus = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('celebrities')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      
      setIsCelebrity(!!data);
    };

    checkCelebrityStatus();
  }, [profile]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    if (path === "/all-services") {
      return currentPath === "/all-services" || (currentPath.startsWith("/travel") && currentPath !== "/travel/trips");
    }
    if (path === "/travel/trips") {
      return currentPath === "/travel/trips";
    }
    return currentPath.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header with Logo */}
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <div className="flex items-center h-full px-2 gap-2">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-primary p-[2px] overflow-hidden">
            <div className="w-full h-full rounded-md bg-sidebar overflow-hidden">
              <img 
                src="/wish-me-logo.png" 
                alt="Wish Me" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Brand Text */}
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
              Wish Me
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wide">
              Dashboard
            </p>
          </div>
          
          {/* Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className="h-7 w-7 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={active}
                    >
                      <NavLink to={item.url} end={item.url === "/dashboard"}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Celebrity Dashboard - Only for celebrities */}
              {isCelebrity && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Celebrity Dashboard"
                    isActive={isActive("/celebrity-dashboard")}
                  >
                    <NavLink to="/celebrity-dashboard">
                      <Crown className="h-4 w-4" />
                      <span>Celebrity Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={isActive("/settings")}>
              <NavLink to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Logout" 
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}