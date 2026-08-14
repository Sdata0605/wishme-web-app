import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { UserSidebar } from "@/components/dashboard/UserSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function AuthenticatedLayout({ children, showSidebar = true }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-[60px] mobile-safe-bottom">
          {children}
        </div>
        <Footer />
        <MobileBottomNav isSignedIn={!!user} />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        {showSidebar && <UserSidebar />}
        
        <SidebarInset className="flex-1">
          <Header showSidebarTrigger={showSidebar} />
          
          <main className="flex-1">
            {children}
          </main>
          
          <Footer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}