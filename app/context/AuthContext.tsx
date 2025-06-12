import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const retryAttempts = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Subscribe to auth state changes with enhanced error handling
    let subscription: any;
    try {
      const { data } = authService.onAuthStateChange(async (user, event) => {
        console.log('Auth state changed:', user ? `User: ${user.id}` : 'No user', 'Event:', event);
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully');
          retryAttempts.current = 0; // Reset retry counter on successful refresh
          setUser(user);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Handle user state changes
        if (user) {
          console.log('User authenticated:', user.id);
          retryAttempts.current = 0; // Reset retry counter
          setUser(user);
        } else {
          // User is null - check if we should attempt session recovery
          console.log('User state is null - checking if session recovery is needed...');
          
          // Only attempt session recovery if there's a possibility of a valid session
          // (e.g., we had a user before, or there's evidence of stored session data)
          const shouldAttemptRecovery = retryAttempts.current < maxRetries && 
                                      (user !== null || typeof window !== 'undefined');
          
          if (shouldAttemptRecovery) {
            console.log(`Attempting session recovery (attempt ${retryAttempts.current + 1}/${maxRetries})`);
            retryAttempts.current++;
            
            try {
              // First check if there's actually a session to recover
              const session = await authService.getSession();
              if (session?.user) {
                console.log('✅ Session recovered successfully');
                setUser(session.user);
                setLoading(false);
                return;
              } else if (session === null) {
                // No session exists - this is normal for logged out users
                console.log('No session exists - user is logged out');
                setUser(null);
                setLoading(false);
                return;
              }
              
              // Only try refresh if we have a session with refresh token
              if (session?.refresh_token) {
                console.log('Attempting to refresh session...');
                const refreshData = await authService.refreshSession();
                if (refreshData?.session?.user) {
                  console.log('✅ Session refresh successful');
                  setUser(refreshData.session.user);
                  setLoading(false);
                  return;
                }
              }
            } catch (refreshError) {
              // Only log error if it's not a "no session" error
              if (refreshError?.message && !refreshError.message.includes('session missing')) {
                console.error('Session recovery failed:', refreshError);
              } else {
                console.log('No existing session to recover - user is logged out');
              }
            }
          }
          
          // If we reach here, either no recovery was needed or it failed
          console.log('Setting user to null - no valid session found');
          setUser(null);
        }
        
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (error) {
      console.error('Failed to subscribe to auth state changes:', error);
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
      
      // First try to get the user
      let user = await authService.getCurrentUser();
      console.log('🔍 AuthContext: getCurrentUser result:', user ? `User ID: ${user.id}` : 'No user');
      
      // If no user, try to get the session directly
      if (!user) {
        console.log('🔍 AuthContext: No user found, checking session...');
        const session = await authService.getSession();
        if (session?.user) {
          console.log('🔍 AuthContext: Found user in session:', session.user.id);
          user = session.user;
        }
      }
      
      if (user) {
        console.log('🔍 AuthContext: Setting user (navigation handled by index.tsx)');
        setUser(user);
        retryAttempts.current = 0; // Reset retry counter
      } else {
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
      retryAttempts.current = 0; // Reset retry counter
      
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
        retryAttempts.current = 0; // Reset retry counter
        
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
        retryAttempts.current = 0; // Reset retry counter
        
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
      retryAttempts.current = 0; // Reset retry counter
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