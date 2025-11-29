import { useMemo } from "react";
import { Link } from "wouter";
import {
  Home,
  Menu,
  Award,
  PlusCircle,
  Users,
  Zap,
  UserCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

type MenuLink = {
  label: string;
  href: string;
  icon: typeof Home;
  requiresAdmin?: boolean;
};

const MENU_LINKS: MenuLink[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "My Leagues", href: "/leagues", icon: Users },
  { label: "Create League", href: "/league/create", icon: PlusCircle },
  { label: "Leaderboard", href: "/rankings", icon: Award },
  { label: "Prediction Streak", href: "/prediction-streak", icon: Zap },
  { label: "Invite Friends", href: "/invite", icon: Users },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Admin", href: "/admin", icon: ShieldCheck, requiresAdmin: true },
];

export function HamburgerMenu() {
  const { user, logout } = useAuth();

  const initials = useMemo(() => {
    if (!user?.name) {
      return "CL";
    }
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const filteredLinks = MENU_LINKS.filter((item) =>
    item.requiresAdmin ? user?.role === "admin" : true
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-white/40 hover:bg-white/10"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex h-full flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="bg-gradient-to-br from-weed-burgundy to-weed-purple text-left text-white">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/10 text-lg text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold leading-tight">{user?.name || "Guest Player"}</p>
              <p className="text-sm text-white/70">{user?.email}</p>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {filteredLinks.map((link) => (
              <li key={link.label}>
                <SheetClose asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-white/5"
                    )}
                  >
                    <link.icon className="h-5 w-5 text-weed-green" />
                    <span>{link.label}</span>
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <SheetFooter className="border-t border-border bg-muted/20">
          <SheetClose asChild>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-center gap-2 text-foreground"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


