import { createContext, useContext, useState } from 'react';

type AuthContextType = {
  session: { user: { id: string; email: string } } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>({
    user: { id: 'mock-user-id', email: 'mock@example.com' }
  });
  const [loading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setSession({ user: { id: 'mock-user-id', email } });
  };

  const signUp = async (email: string, password: string) => {
    setSession({ user: { id: 'mock-user-id', email } });
  };

  const signOut = async () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 