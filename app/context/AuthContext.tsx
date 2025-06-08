import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import * as authService from '../services/auth';
import { useRouter } from 'expo-router';
import { SignUpData } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Subscribe to auth state changes with error handling
    let subscription: any;
    try {
      const { data } = authService.onAuthStateChange((user) => {
        console.log('Auth state changed:', user ? `User: ${user.id}` : 'No user');
        setUser(user);
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (error) {
      console.error('Failed to subscribe to auth state changes:', error);
      // Ensure loading is set to false even if subscription fails
      setLoading(false);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from auth state:', error);
      }
    };
  }, []);

  const checkUser = async () => {
    console.log('🔍 AuthContext: Starting checkUser...');
    try {
      console.log('🔍 AuthContext: Calling getCurrentUser...');
      const user = await authService.getCurrentUser();
      console.log('🔍 AuthContext: getCurrentUser result:', user ? `User ID: ${user.id}` : 'No user');
      
      if (user) {
        console.log('🔍 AuthContext: Setting user (navigation handled by index.tsx)');
        setUser(user);
      } else {
        // No user found - this is normal for unauthenticated state
        console.log('🔍 AuthContext: No user found - normal unauthenticated state');
      }
    } catch (error) {
      console.error('🚨 AuthContext checkUser error:', error);
      console.error('🚨 Error details:', error instanceof Error ? error.message : String(error));
      
      // Don't crash the app - just ensure we're not stuck in loading state
      console.log('🔍 AuthContext: Auth check failed, user will need to sign in');
    } finally {
      // Always ensure loading is set to false
      console.log('🔍 AuthContext: Setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await authService.signIn({ email, password });
      setUser(user);
      
      // Simplified routing - avoid API calls during sign-in
      if (user && user.user_metadata?.onboardingComplete === false) {
        router.replace('/onboarding/profile-info');
      } else {
        router.replace('/(tabs)/lists');
      }
    } catch (error) {
      throw error;
    }
  };
  
  const signInWithGoogle = async () => {
    try {
      const result = await authService.signInWithGoogle();
      
      if (result?.session) {
        setUser(result.session.user);
        
        // Simplified routing
        if (result.session.user.user_metadata?.onboardingComplete === false) {
          router.replace('/onboarding/profile-info');
        } else {
          router.replace('/(tabs)/lists');
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Google sign-in error:', error);
      }
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      const result = await authService.signInWithApple();
      
      if (result?.session) {
        setUser(result.session.user);
        
        // Simplified routing
        if (result.session.user.user_metadata?.onboardingComplete === false) {
          router.replace('/onboarding/profile-info');
        } else {
          router.replace('/(tabs)/lists');
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Apple sign-in error:', error);
      }
      throw error;
    }
  };

  const signUp = async (data: SignUpData) => {
    try {
      const { error } = await authService.signUp(data);
      if (error) throw error;
      // Don't automatically sign in after signup - wait for email confirmation
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      router.replace('/auth/login');
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
  };

  // AuthProvider only provides context - no rendering logic
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 