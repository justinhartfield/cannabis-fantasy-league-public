import { ReactNode, useState, useEffect } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { ProfileSetupDialog } from "./ProfileSetupDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type AppLayoutProps = {
  children: ReactNode;
};

const PROFILE_SETUP_KEY = "cfl_profile_setup_complete";

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Check if this is a new user who needs profile setup
  const { data: profile, isLoading: profileLoading } = trpc.profile.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (loading || profileLoading || !isAuthenticated) return;

    // Check if profile setup was already completed this session
    const setupComplete = localStorage.getItem(PROFILE_SETUP_KEY);
    if (setupComplete) return;

    // Show dialog if user has no name set or has the default email-based name
    const needsSetup = !profile?.name || 
      profile.name.includes("@") || // Email used as name
      profile.name.trim() === "" ||
      profile.name === "User"; // Default fallback name

    if (needsSetup) {
      setShowProfileSetup(true);
    }
  }, [loading, profileLoading, isAuthenticated, profile?.name]);

  const handleProfileSetupComplete = () => {
    setShowProfileSetup(false);
    // Mark setup as complete for this session to avoid showing again
    localStorage.setItem(PROFILE_SETUP_KEY, "true");
  };

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell-main px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
      </main>
      <BottomNav />
      
      {/* Profile setup dialog for new users */}
      <ProfileSetupDialog
        open={showProfileSetup}
        onComplete={handleProfileSetupComplete}
        currentName={profile?.name || ""}
        currentAvatarUrl={profile?.avatarUrl}
      />
    </div>
  );
}


