import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { UserCircle } from "lucide-react";
import logoImage from "../cfl-logo.png";

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
  const { t, availableLanguages, language, setLanguage } = useLanguage();

  // Hide navigation on login and invitation pages
  if (location === '/login' || location.startsWith('/invitations/')) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Home link */}
          <div className="flex items-center gap-2 md:gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <img
                src={logoImage}
                alt="Cannabis Fantasy League"
                className="h-10 md:h-16 w-auto object-contain"
              />
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/leaderboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === "/leaderboard"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {t("leaderboard")}
              </Link>

              <Link
                href="/invite"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === "/invite"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {t("inviteFriends")}
              </Link>
            </div>
          </div>

          {/* Right side - User info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/40 px-2 py-1">
              {availableLanguages.map((langOption) => {
                const isActive = langOption.code === language;
                return (
                  <button
                    key={langOption.code}
                    type="button"
                    onClick={() => setLanguage(langOption.code)}
                    className={`text-lg leading-none transition-opacity ${
                      isActive
                        ? "opacity-100"
                        : "opacity-40 hover:opacity-80 focus:opacity-80"
                    }`}
                    aria-pressed={isActive}
                    aria-label={`${t("language")}: ${langOption.label}`}
                  >
                    <span role="img" aria-hidden="true">
                      {langOption.flag}
                    </span>
                  </button>
                );
              })}
            </div>
            {user && (
              <Link
                href="/profile"
                aria-label={t("profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer"
              >
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {user.name || user.email}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
