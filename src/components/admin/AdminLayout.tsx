import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "./AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (profile && profile.role !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, profile, navigate]);

  if (!user || !profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background admin-layout">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Admin Header */}
          <header className="h-14 sm:h-16 border-b bg-card flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
            <div className="flex items-center space-x-3">
              <SidebarTrigger className="h-9 w-9" />
              <h1 className="text-base sm:text-xl font-semibold truncate">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <User className="w-4 h-4" />
                <span>{profile.first_name} {profile.last_name}</span>
                <span className="text-muted-foreground">({profile.email})</span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}