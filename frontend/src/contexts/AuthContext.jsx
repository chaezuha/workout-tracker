import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  isGuestMode,
  enableGuestMode,
  disableGuestMode,
} from "@/lib/guestMode";
import { seedGuestTemplatesOnce } from "@/services/localStore";

const AuthContext = createContext(null);

// Sentinel user for guest mode: truthy so the app's `!user` gates and
// `[user]` effects behave exactly as for a signed-in user.
const GUEST_USER = { id: "guest", email: null, isGuest: true };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestActive, setGuestActive] = useState(() => isGuestMode());
  // null | "signin" | "signup" — set when a guest opens the auth form.
  // In-memory only: a refresh mid-form lands back in the guest app.
  const [authScreen, setAuthScreen] = useState(null);

  useEffect(() => {
    // A real session always wins over guest mode; the guest flag must be
    // cleared before pages mount so services stop reading localStorage.
    const resolveSession = (session) => {
      if (session) {
        disableGuestMode();
        setGuestActive(false);
        setAuthScreen(null);
      }
      setSession(session);
    };

    supabase.auth.getSession().then(({ data }) => {
      resolveSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isGuest = !session && guestActive && !authScreen;

  const value = {
    session,
    user: session?.user ?? (isGuest ? GUEST_USER : null),
    isGuest,
    authScreen,
    loading,
    continueAsGuest: () => {
      enableGuestMode();
      seedGuestTemplatesOnce();
      setGuestActive(true);
      setAuthScreen(null);
    },
    showAuthScreen: (mode) => setAuthScreen(mode),
    cancelAuthScreen: () => setAuthScreen(null),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
