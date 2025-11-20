import { useUser, useClerk } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";
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
