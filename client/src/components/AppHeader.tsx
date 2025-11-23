import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { HamburgerMenu } from "./HamburgerMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_TITLE } from "@/const";

export function AppHeader() {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CL";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#050505]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#050505]/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <HamburgerMenu />

        <Link href="/" className="flex flex-col items-center gap-0 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-white/60">
            CannaLeague
          </span>
          <span className="text-lg font-bold tracking-wide text-white">
            {APP_TITLE}
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-white/40 hover:bg-white/10"
        >
          {user?.avatarUrl ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.name || "Profile"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-sm font-semibold uppercase tracking-wide">
              {initials}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}


