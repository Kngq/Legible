"use client";

// Account auth state for the app. Wraps Supabase email/password auth and exposes
// a small hook. Session is kept by the Supabase client (localStorage) and never
// mixed with the Legible profile store. Only email/password/session live here.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authConfigured, supabase } from "@/lib/auth/supabase";

interface AuthResult {
  error: string | null;
  /** Sign-up with email confirmation on: the session is null until confirmed. */
  needsConfirmation?: boolean;
}

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Only "loading" while there is a client to query for an existing session.
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Sign up is not available right now." };
    const options = name?.trim() ? { data: { name: name.trim() } } : undefined;
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) return { error: error.message };
    // With email confirmation on, there is a user but no session yet.
    return { error: null, needsConfirmation: Boolean(data.user) && !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Login is not available right now." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ configured: authConfigured, loading, session, user: session?.user ?? null, signUp, signIn, signOut }),
    [loading, session, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
