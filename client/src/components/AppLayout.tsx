import { ReactNode, useState, useEffect, useRef } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { GlobalFooter } from "./GlobalFooter";
import { ProfileSetupDialog } from "./ProfileSetupDialog";
import { GlobalNotifications } from "./GlobalNotifications";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUser } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";

type AppLayoutProps = {
  children: ReactNode;
};

const PROFILE_SETUP_KEY = "cfl_profile_setup_complete";

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [needsAvatar, setNeedsAvatar] = useState(false);
  const syncAttemptedRef = useRef(false);
  const utils = trpc.useUtils();

  // Check if this is a new user who needs profile setup
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = trpc.profile.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Sync profile from Clerk
  const syncFromClerkMutation = trpc.profile.syncFromClerk.useMutation({
    onSuccess: (result) => {
      if (result.synced) {
        console.log('[AppLayout] Synced profile from Clerk:', result);
        refetchProfile();
        utils.auth.me.invalidate();
      }
    },
  });

  // Auto-sync from Clerk when user logs in
  useEffect(() => {
    if (loading || profileLoading || !isAuthenticated || !clerkLoaded || !clerkUser) return;
    if (syncAttemptedRef.current) return;

    syncAttemptedRef.current = true;

    // Get Clerk user data
    const clerkUsername = clerkUser.username || undefined;
    const clerkFullName = clerkUser.fullName || clerkUser.firstName || undefined;
    const clerkImageUrl = clerkUser.imageUrl || undefined;

    // Sync from Clerk if we have useful data
    if (clerkUsername || clerkFullName || clerkImageUrl) {
      syncFromClerkMutation.mutate({
        clerkUsername,
        clerkFullName,
        clerkImageUrl,
      });
    }
  }, [loading, profileLoading, isAuthenticated, clerkLoaded, clerkUser]);

  // Determine what setup is needed
  useEffect(() => {
    if (loading || profileLoading || !isAuthenticated || !clerkLoaded) return;

    // Check if profile setup was already completed this session
    const setupComplete = localStorage.getItem(PROFILE_SETUP_KEY);
    if (setupComplete) return;

    // Wait for sync to complete
    if (syncFromClerkMutation.isPending) return;

    // Get Clerk user data for comparison
    const clerkUsername = clerkUser?.username;
    const clerkFullName = clerkUser?.fullName || clerkUser?.firstName;
    const clerkImageUrl = clerkUser?.imageUrl;

    // Check if name looks like a random fallback
    const hasRandomName = !profile?.name || 
      profile.name.startsWith("user_") ||
      profile.name.includes("@") || 
      profile.name.trim() === "" ||
      profile.name === "User";

    // Check if we have a real name from Clerk that wasn't synced
    const clerkNameValue = clerkUsername || clerkFullName || "";
    const clerkNameIsReal = clerkNameValue && !clerkNameValue.startsWith("user_");

    // Determine what's needed:
    // - If user has random name AND Clerk doesn't have a real name -> prompt for username
    // - If user has no avatar AND Clerk has one (Google login) -> use Clerk's, maybe skip avatar prompt
    // - If user has no avatar AND Clerk doesn't have one -> prompt for avatar

    const userNeedsUsername = hasRandomName && !clerkNameIsReal;
    const userNeedsAvatar = !profile?.avatarUrl && !clerkImageUrl;

    setNeedsUsername(userNeedsUsername);
    setNeedsAvatar(userNeedsAvatar);

    // Only show dialog if something is needed
    if (userNeedsUsername || userNeedsAvatar) {
      setShowProfileSetup(true);
    }
  }, [loading, profileLoading, isAuthenticated, clerkLoaded, clerkUser, profile, syncFromClerkMutation.isPending]);

  const handleProfileSetupComplete = () => {
    setShowProfileSetup(false);
    // Mark setup as complete for this session to avoid showing again
    localStorage.setItem(PROFILE_SETUP_KEY, "true");
  };

  // Get the best available name and avatar
  const displayName = profile?.name && !profile.name.startsWith("user_") 
    ? profile.name 
    : clerkUser?.username || clerkUser?.fullName || profile?.name || "";
  
  const displayAvatar = profile?.avatarUrl || clerkUser?.imageUrl || null;

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell-main px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
      </main>
      
      {/* Global Footer */}
      <GlobalFooter />
      
      <BottomNav />
      
      {/* Global notifications for challenge events (opponent joined, etc.) */}
      <GlobalNotifications />
      
      {/* Profile setup dialog for new users */}
      <ProfileSetupDialog
        open={showProfileSetup}
        onComplete={handleProfileSetupComplete}
        currentName={displayName}
        currentAvatarUrl={displayAvatar}
        needsUsername={needsUsername}
        needsAvatar={needsAvatar}
      />
    </div>
  );
}


