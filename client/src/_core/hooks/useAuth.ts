import { useUser, useClerk } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (error: unknown) {
      console.error("Logout error:", error);
      throw error;
    }
  }, [signOut]);

  const state = useMemo(() => {
    // Map Clerk user to our app's user format
    const mappedUser = user ? {
      id: user.id,
      name: user.fullName || user.username || "",
      email: user.primaryEmailAddress?.emailAddress || "",
      username: user.username || "",
    } : null;

    // Store user info in localStorage for compatibility
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(mappedUser)
    );

    return {
      user: mappedUser,
      loading: !isLoaded,
      error: null,
      isAuthenticated: isSignedIn || false,
    };
  }, [user, isLoaded, isSignedIn]);

  return {
    ...state,
    refresh: () => {
      // Clerk handles refresh automatically
      return Promise.resolve({ data: state.user });
    },
    logout,
  };
}
