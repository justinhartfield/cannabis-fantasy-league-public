import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Home, UserCircle } from "lucide-react";
import { APP_TITLE } from "@/const";

/**
 * Navigation Component
 * 
 * Persistent navigation menu that appears on every page
 * - Home link on the left
 * - Username display on the right (will be clickable for profile later)
 */
export function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Hide navigation on login and invitation pages
  if (location === '/login' || location.startsWith('/invitations/')) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Home link */}
          <Link href="/">
            <a className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <Home className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{APP_TITLE}</span>
            </a>
          </Link>

          {/* Right side - User info */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/50">
              <UserCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {user.name || user.email}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
