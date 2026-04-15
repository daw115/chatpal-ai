import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as api from "@/lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = api.getAuthToken();
    if (token) {
      // Token exists, user is logged in
      // We don't have user info stored, so we'll set a placeholder
      // In a real app, you'd decode the JWT or fetch user info
      setUser({ id: 'user', email: 'user@example.com' });
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const data = await api.register(email, password);
      setUser(data.user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Login failed') };
    }
  };

  const signOut = async () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
