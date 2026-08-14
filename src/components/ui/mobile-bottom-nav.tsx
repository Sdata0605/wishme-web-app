import { 
  Home, 
  User, 
  Music, 
  Users,
  LogIn,
  Phone,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  isSignedIn?: boolean;
}

export function MobileBottomNav({ isSignedIn = false }: MobileBottomNavProps) {
  const location = useLocation();

  const navItems = [
    { 
      icon: Home, 
      label: isSignedIn ? "Dashboard" : "Home", 
      href: isSignedIn ? "/dashboard" : "/" 
    },
    { icon: Phone, label: "Voice Call", href: "/celebrity-voice-call" },
    { icon: Users, label: "Celebrities", href: "/celebrities" },
    { 
      icon: Music, 
      label: "AI Music", 
      href: "/ai-music" 
    },
    { 
      icon: isSignedIn ? User : LogIn, 
      label: isSignedIn ? "Profile" : "Sign In", 
      href: isSignedIn ? "/profile" : "/auth" 
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-primary/20 z-50 md:hidden shadow-lg">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 relative min-h-[44px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:text-primary"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
              <item.icon className={cn(
                "w-5 h-5 mb-0.5 transition-all duration-200",
                isActive ? "scale-110" : "scale-100"
              )} />
              <span className={cn(
                "text-[10px] font-medium leading-tight",
                isActive ? "text-primary" : "text-foreground"
              )}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
