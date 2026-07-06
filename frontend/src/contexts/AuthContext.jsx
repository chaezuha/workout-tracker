import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  isGuestMode,
  enableGuestMode,
  disableGuestMode,
} from "@/lib/guestMode";
import { seedGuestTemplatesOnce } from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { clear as clearOutbox } from "@/services/outbox";
import { initSync, hydrate, flush } from "@/services/sync";
import { CACHE_USER_KEY } from "@/lib/syncKeys";

const AuthContext = createContext(null);

// Sentinel user for guest mode: truthy so the app's `!user` gates and
// `[user]` effects behave exactly as for a signed-in user.
const GUEST_USER = { id: "guest", email: null, isGuest: true };

// supabase-js persists its session under sb-<ref>-auth-token. If such a
// token exists, this device belongs to a signed-in user even when the
// session can't be confirmed right now (offline with an expired token).
function hasPersistedSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {
    // storage unavailable; treat as no session
  }
  return false;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestActive, setGuestActive] = useState(() => isGuestMode());

  useEffect(() => {
    initSync();

    // A real session always wins over guest mode; the guest flag must be
    // cleared before pages mount so services stop reading localStorage.
    const resolveSession = (session, event) => {
      if (session) {
        disableGuestMode();
        setGuestActive(false);
        if (localStorage.getItem(CACHE_USER_KEY) !== session.user.id) {
          // A different account signed in on this device: its mirror and
          // pending writes must not leak into the new account.
          cacheStore.clear();
          clearOutbox();
          localStorage.setItem(CACHE_USER_KEY, session.user.id);
        }
        hydrate();
      } else if (event === "SIGNED_OUT" || !hasPersistedSession()) {
        // Genuinely signed out (or never signed in): guest mode by default.
        enableGuestMode();
        seedGuestTemplatesOnce();
        setGuestActive(true);
      }
      // Otherwise the null session is transient — a token refresh failing
      // offline — and flipping into guest mode would hide the signed-in
      // user's local mirror. Keep the current mode; the offline-user
      // fallback below keeps pages working until the session refreshes.
      setSession(session);
    };

    supabase.auth.getSession().then(({ data }) => {
      resolveSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      resolveSession(session, event);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isGuest = !session && guestActive;

  // Offline-authenticated fallback: no confirmable session, but this device
  // has a persisted sign-in and a mirror for that user. Truthy like
  // GUEST_USER so pages load (from the cache mirror, via the services).
  const cachedUserId =
    !session && !guestActive ? localStorage.getItem(CACHE_USER_KEY) : null;
  const offlineUser = cachedUserId
    ? { id: cachedUserId, email: null, isOffline: true }
    : null;

  const value = {
    session,
    user: session?.user ?? (isGuest ? GUEST_USER : offlineUser),
    isGuest,
    loading,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: async () => {
      // Push pending offline writes before the session goes away; anything
      // that can't flush stays queued for this user's next sign-in.
      try {
        await flush();
      } catch {
        // flush handles its own errors; queued ops survive regardless
      }
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
