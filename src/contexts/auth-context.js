"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { syncUser } from "@/app/actions";

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const handleSession = async (session) => {
      const activeUser = session?.user || null;
      if (!active) return;
      setUser(activeUser);
      setLoading(false);
      // Mirror the Supabase auth user into our own User table.
      if (activeUser) {
        try {
          await syncUser({
            name: activeUser.user_metadata?.name || activeUser.email?.split("@")[0],
            phone: activeUser.user_metadata?.phone,
          });
        } catch (e) {
          console.error("syncUser failed:", e);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase.auth]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
