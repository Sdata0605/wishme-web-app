import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Activity,
  Users,
  Star,
  CreditCard,
  BookOpen,
  TrendingUp,
  Settings,
  Calendar,
  Receipt,
  Wallet,
  Heart,
  Video,
  Image,
  MessageSquare,
  Mail,
  ChevronLeft,
  Shield,
  Sparkles,
  FolderKanban,
  Layers,
  Bot,
  LifeBuoy,
} from "lucide-react";
import { Database } from "lucide-react";

const adminNavItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Celebrities", url: "/admin/celebrities", icon: Star },
  { title: "Categories", url: "/admin/celebrity-categories", icon: FolderKanban },
  { title: "Plans", url: "/admin/plans", icon: CreditCard },
  { title: "Bookings", url: "/admin/bookings", icon: BookOpen },
  { title: "Wish Orders", url: "/admin/wish-orders", icon: Sparkles },
  { title: "Occasions", url: "/admin/occasions", icon: Calendar },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: Heart },
  { title: "Wallet", url: "/admin/wallet", icon: Wallet },
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
  { title: "Audit Log", url: "/admin/audit-log", icon: Shield },
  { title: "TDS Reports", url: "/admin/tds-reports", icon: Receipt },
  { title: "Media Library", url: "/admin/media-library", icon: Video },
  { title: "Banner Media", url: "/admin/banner-media-library", icon: Image },
  { title: "Communication Hub", url: "/admin/communication-hub", icon: Mail },
  { title: "Tickets", url: "/admin/tickets", icon: LifeBuoy },
  { title: "AI Assistant", url: "/admin/ai-assistant", icon: Bot },
  { title: "API Health", url: "/admin/api-health", icon: Activity },
  { title: "Database Backup", url: "/admin/database-backup", icon: Database },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function TicketsOpenBadge() {
  const { data: openCount = 0 } = useQuery({
    queryKey: ["admin-support-open-count"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      if (error) throw error;
      return (count ?? 0) as number;
    },
    refetchInterval: 60_000,
  });

  if (openCount <= 0) return null;

  return (
    <>
      {/* Expanded: numeric count */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
        {openCount > 99 ? "99+" : openCount}
      </span>
      {/* Collapsed to icons: plain dot */}
      <span className="pointer-events-none absolute right-1.5 top-1.5 hidden h-2 w-2 rounded-full bg-primary group-data-[collapsible=icon]:block" />
    </>
  );
}

export function AdminSidebar() {
  const { open, setOpen, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin";
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header with Logo */}
      <SidebarHeader className="h-14 border-b border-sidebar-border">
        <div className="flex items-center h-full px-2 gap-2">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-primary p-[2px]">
            <div className="w-full h-full rounded-md bg-sidebar flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
          
          {/* Brand Text */}
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
              Admin
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wide">
              Panel
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
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <NavLink to={item.url} end={item.url === "/admin"} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.url === "/admin/tickets" && <TicketsOpenBadge />}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-2 rounded-lg bg-sidebar-accent/30">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-sidebar-foreground/60">System Online</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}