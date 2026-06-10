import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { useCallback, useState } from "react";

export function useAuth() {
  const { isLoaded, userId, sessionId, getToken, signOut } = useAuthBypassClerkHelper();
  const { user } = useClerkUser();

  const [devToken, setDevToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dev_auth_token");
    }
    return null;
  });

  const logout = useCallback(async () => {
    if (devToken) {
      localStorage.removeItem("dev_auth_token");
      setDevToken(null);
      window.location.href = "/";
    } else {
      await signOut();
    }
  }, [devToken, signOut]);

  const devLogin = useCallback((username: string) => {
    localStorage.setItem("dev_auth_token", username);
    setDevToken(username);
    window.location.href = "/dashboard";
  }, []);

  if (devToken) {
    return {
      user: {
        id: `dev-${devToken}`,
        name: `${devToken} (Dev)`,
        email: `${devToken}@example.com`,
        avatarUrl: null,
      },
      loading: false,
      error: null,
      isAuthenticated: true,
      refresh: () => {},
      logout,
      devLogin,
      devToken,
    };
  }

  return {
    user: user ? {
      id: user.id,
      name: user.fullName,
      email: user.primaryEmailAddress?.emailAddress,
      avatarUrl: user.imageUrl,
    } : null,
    loading: !isLoaded,
    error: null,
    isAuthenticated: !!userId,
    refresh: () => {}, // No-op, Clerk handles token refreshing automatically
    logout,
    devLogin,
    devToken: null,
  };
}

function useAuthBypassClerkHelper() {
  try {
    return useClerkAuth();
  } catch (err) {
    // If Clerk is not initialized or throws in test environment
    return { isLoaded: true, userId: null, sessionId: null, getToken: async () => null, signOut: async () => {} };
  }
}
