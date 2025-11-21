import { useUser, useClerk } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  
  // Fetch the database user (which has the numeric ID we need)
  const { data: dbUser } = trpc.auth.me.useQuery(undefined, {
    enabled: isSignedIn && isLoaded,
  });

  const applyReferralMutation = trpc.profile.applyReferralCode.useMutation();
  const hasTriedReferralRef = useRef(false);

  // Automatically apply any stored referral code once the user is fully authenticated
  useEffect(() => {
    if (!isSignedIn || !isLoaded || !dbUser) return;
    if (hasTriedReferralRef.current) return;

    let storedCode: string | null = null;
    try {
      storedCode = localStorage.getItem("cfl_referral_code");
    } catch {
      storedCode = null;
    }

    if (!storedCode) {
      hasTriedReferralRef.current = true;
      return;
    }

    hasTriedReferralRef.current = true;

    applyReferralMutation.mutate(
      { code: storedCode },
      {
        onSettled: () => {
          try {
            localStorage.removeItem("cfl_referral_code");
          } catch {
            // ignore storage errors
          }
        },
      }
    );
  }, [isSignedIn, isLoaded, dbUser, applyReferralMutation]);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (error: unknown) {
      console.error("Logout error:", error);
      throw error;
    }
  }, [signOut]);

  const state = useMemo(() => {
    // Map database user to our app's user format
    // Use database user ID (numeric) instead of Clerk ID (string)
    const mappedUser = dbUser ? {
      id: dbUser.id, // This is the numeric database ID
      name: dbUser.name || clerkUser?.fullName || clerkUser?.username || "",
      email: dbUser.email || clerkUser?.primaryEmailAddress?.emailAddress || "",
      username: dbUser.name || clerkUser?.username || "",
      currentPredictionStreak: dbUser.currentPredictionStreak || 0,
      longestPredictionStreak: dbUser.longestPredictionStreak || 0,
      avatarUrl: dbUser.avatarUrl || clerkUser?.imageUrl,
    } : null;

    // Store user info in localStorage for compatibility
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(mappedUser)
    );

    return {
      user: mappedUser,
      loading: !isLoaded || (isSignedIn && !dbUser), // Wait for both Clerk and database user
      error: null,
      isAuthenticated: isSignedIn && !!dbUser, // Only authenticated if we have both
    };
  }, [dbUser, clerkUser, isLoaded, isSignedIn]);

  return {
    ...state,
    refresh: () => {
      // Clerk handles refresh automatically
      return Promise.resolve({ data: state.user });
    },
    logout,
  };
}
