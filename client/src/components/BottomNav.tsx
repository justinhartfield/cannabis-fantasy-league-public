import { Home, Trophy, Zap, UserCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type NavItem = {
  label: string;
  icon: typeof Home;
  path: string;
  match?: (location: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    icon: Home,
    path: "/",
    match: (location) => location === "/" || location.startsWith("/home"),
  },
  {
    label: "Leagues",
    icon: Trophy,
    path: "/leagues",
    match: (location) =>
      location.startsWith("/league") ||
      location.startsWith("/challenge") ||
      location.startsWith("/leagues"),
  },
  {
    label: "Predict",
    icon: Zap,
    path: "/prediction-streak",
    match: (location) =>
      location.startsWith("/prediction") || location.startsWith("/daily"),
  },
  {
    label: "Profile",
    icon: UserCircle,
    path: "/profile",
    match: (location) => location.startsWith("/profile"),
  },
];

export function BottomNav() {
  const [location] = useLocation();

  const activeItem = useMemo(() => {
    return (
      NAV_ITEMS.find((item) =>
        item.match ? item.match(location) : item.path === location
      ) ?? NAV_ITEMS[0]
    );
  }, [location]);

  return (
    <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050505]/95 backdrop-blur supports-[backdrop-filter]:bg-[#050505]/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3 text-xs font-medium text-muted-foreground">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeItem.label;

          return (
            <Link
              key={item.label}
              href={item.path}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-1 transition-all duration-200",
                isActive ? "text-white" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl text-base",
                  isActive
                    ? "bg-gradient-to-br from-weed-green to-weed-coral text-black shadow-[0_8px_18px_rgba(163,255,18,0.35)]"
                    : "bg-white/5 text-white/60"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-black" : "text-white/60")} />
              </span>
              <span
                className={cn(
                  "uppercase tracking-wide",
                  isActive ? "text-xs text-white" : "text-[11px]"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


