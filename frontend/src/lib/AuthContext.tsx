"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api, { getErrorMessage } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  registerPatient: (
    payload: Record<string, any>,
  ) => Promise<{ success: boolean; error?: string }>;
  registerAgent: (
    payload: Record<string, any>,
  ) => Promise<{ success: boolean; error?: string }>;
  refetch: (token?: string) => Promise<User | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProfile = useCallback(async (token?: string) => {
    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const { data } = await api.get("/auth/me", config);
      setUser(data.user);
      return data.user as User;
    } catch (err) {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await fetchProfile();
      } else {
        // Try refresh — critical for mobile where session cookie may not be loaded yet
        const {
          data: { session: refreshed },
        } = await supabase.auth.refreshSession();
        if (refreshed) {
          await fetchProfile();
        }
      }

      if (mounted) setLoading(false);
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const profile = await fetchProfile();
          if (mounted && profile) setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          if (mounted) setLoading(false);
        } else if (event === "TOKEN_REFRESHED") {
          // Token refreshed, keep current user state
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (!data.session) {
        setError("Login failed — no session returned");
        return { success: false, error: "Login failed" };
      }

      // Pass token directly — don't rely on getSession() which fails on mobile
      const profile = await fetchProfile(data.session.access_token);

      if (!profile) {
        setError("Failed to load user profile");
        return { success: false, error: "Failed to load user profile" };
      }

      // Route based on role
      if (profile.role === "admin") {
        router.push("/admin/dashboard");
      } else if (profile.role === "agent") {
        router.push("/agent/dashboard");
      } else {
        router.push("/dashboard");
      }

      return { success: true, user: profile };
    },
    [fetchProfile, router],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  }, [router]);

  const registerPatient = useCallback(async (payload: Record<string, any>) => {
    setError(null);
    try {
      await api.post("/auth/register/patient", payload);
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const registerAgent = useCallback(async (payload: Record<string, any>) => {
    setError(null);
    try {
      await api.post("/auth/register/agent", payload);
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        registerPatient,
        registerAgent,
        refetch: fetchProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
