import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { DEMO_SESSION } from "@/lib/chetak/data";

export function useAuth() {
  const [localAuth, setLocalAuth] = useState(() => {
    return localStorage.getItem("chetak_demo_auth") === "true";
  });

  let convexIsLoading = false;
  let convexIsAuthenticated = false;
  let convexUser: any = undefined;
  let convexSignIn: any = null;
  let convexSignOut: any = null;

  try {
    const convexAuth = useConvexAuth();
    convexIsLoading = convexAuth.isLoading;
    convexIsAuthenticated = convexAuth.isAuthenticated;
    convexUser = useQuery(api.users.currentUser);
    const actions = useAuthActions();
    convexSignIn = actions.signIn;
    convexSignOut = actions.signOut;
  } catch (err) {
    console.warn("Convex hooks fallback:", err);
  }

  // Grace period so initial Convex check doesn't block local demo preview
  const [graceFinished, setGraceFinished] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGraceFinished(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const isConvexActive = convexIsAuthenticated && convexUser !== undefined;
  const isAuthenticated = isConvexActive || localAuth;
  const isLoading = !graceFinished && convexIsLoading && !localAuth;
  const user = isConvexActive
    ? convexUser
    : localAuth
    ? { name: DEMO_SESSION.executive.name, email: DEMO_SESSION.email }
    : null;

  const signIn = async (provider?: string, params?: any) => {
    localStorage.setItem("chetak_demo_auth", "true");
    setLocalAuth(true);
    if (convexSignIn && isConvexActive) {
      try {
        await convexSignIn(provider, params);
      } catch (e) {
        console.warn("Convex signIn error:", e);
      }
    }
  };

  const signOut = async () => {
    localStorage.removeItem("chetak_demo_auth");
    setLocalAuth(false);
    if (convexSignOut && isConvexActive) {
      try {
        await convexSignOut();
      } catch (e) {
        console.warn("Convex signOut error:", e);
      }
    }
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}

