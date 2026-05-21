import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNetworkAuthError, retryOnce, withTimeout } from "@/lib/authNetwork";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  backendReachable: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  backendReachable: true,
  refreshSession: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReachable, setBackendReachable] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await withTimeout(retryOnce(() => supabase.auth.getSession()), 8000);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setBackendReachable(true);
    } catch (error) {
      if (isNetworkAuthError(error)) {
        setBackendReachable(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setBackendReachable(true);
        setLoading(false);
      }
    );

    void refreshSession();

    const retryTimer = window.setInterval(() => {
      if (!navigator.onLine) return;
      void refreshSession();
    }, backendReachable ? 60000 : 15000);

    const handleOnline = () => {
      void refreshSession();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(retryTimer);
      window.removeEventListener("online", handleOnline);
    };
  }, [backendReachable, refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, backendReachable, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
