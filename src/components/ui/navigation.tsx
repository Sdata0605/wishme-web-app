import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Star, Heart, Gift } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

export function Navigation({ hideUserMenu = false }: { hideUserMenu?: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const navLinks = [
    { href: "/celebrities", label: "Browse Celebrities" },
    { href: "/business", label: "For Business" },
    { href: "/ai-music", label: "AI Music" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" }
  ];

  const isActiveLink = (href: string) => location.pathname === href;

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/wish-me-logo.png" alt="Wish Me" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Wish Me
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActiveLink(link.href) 
                    ? "text-primary" 
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/plan" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Plans
                </Link>
                <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <Button size="sm" variant="outline" onClick={signOut}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/celebrity-signup" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Join as Celebrity
                </Link>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-gradient-primary hover:bg-primary-dark text-primary-foreground" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                    isActiveLink(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    {profile?.role === 'admin' && (
                      <Button variant="ghost" size="sm" className="justify-start" asChild>
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="justify-start" asChild>
                      <Link to="/plan" onClick={() => setIsMobileMenuOpen(false)}>Plans</Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start" asChild>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { signOut(); setIsMobileMenuOpen(false); }}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="justify-start" asChild>
                      <Link to="/celebrity-signup" onClick={() => setIsMobileMenuOpen(false)}>Join as Celebrity</Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start" asChild>
                      <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button size="sm" className="bg-gradient-primary hover:bg-primary-dark text-primary-foreground" asChild>
                      <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}