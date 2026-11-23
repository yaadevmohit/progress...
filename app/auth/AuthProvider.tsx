"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, requireSupabase } from "../lib/supabase";

type AuthState = { user: User | null; ready: boolean; configured: boolean; error: string };
const AuthContext = createContext<AuthState>({ user: null, ready: false, configured: false, error: "" });
export function useAuth() { return useContext(AuthContext); }
export function displayName(user: User | null) {
  const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  return (typeof name === "string" && name.trim() ? name.trim() : user?.email?.split("@")[0]) || "learner";
}
export async function signOut() {
  const { error } = await requireSupabase().auth.signOut({ scope: "local" });
  if (error) throw error;
}
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const [state, setState] = useState<AuthState>({ user: null, ready: !configured, configured, error: "" });
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let alive = true;
    // INITIAL_SESSION includes restored sessions and PKCE email/OAuth callbacks.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (alive) setState({ user: session?.user ?? null, ready: true, configured: true, error: "" });
    });
    client.auth.getSession().then(({ error }) => {
      if (alive && error) setState({ user: null, ready: true, configured: true, error: error.message });
    }).catch((error: Error) => {
      if (alive) setState({ user: null, ready: true, configured: true, error: error.message });
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
