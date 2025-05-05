import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import * as authService from '../services/auth';
import { useRouter } from 'expo-router';
import { SignUpData } from '../services/auth';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log('AUTH DEBUG:', message);
    setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Subscribe to auth state changes
    addDebugLog('Setting up auth state change listener');
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      addDebugLog(`Auth state changed: user ${user ? 'exists' : 'is null'}`);
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      addDebugLog('Checking current user');
      const user = await authService.getCurrentUser();
      setUser(user);
      
      addDebugLog(`User check complete: ${user ? 'found user' : 'no user'}`);
      
      // Only show onboarding for new users who explicitly have onboardingComplete set to false
      // This assumes existing users don't need to go through onboarding
      if (user && user.user_metadata?.onboardingComplete === false) {
        addDebugLog('Redirecting to onboarding');
        router.replace('/onboarding/frequency');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      addDebugLog(`Error checking user: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      addDebugLog(`Signing in with email: ${email}`);
      const { user } = await authService.signIn({ email, password });
      setUser(user);
      
      // Only redirect to onboarding if explicitly marked as incomplete
      // This assumes existing users don't need to go through onboarding
      if (user && user.user_metadata?.onboardingComplete === false) {
        addDebugLog('Redirecting to onboarding after email sign-in');
        router.replace('/onboarding/frequency');
      } else {
        // Direct users to the search tab
        addDebugLog('Redirecting to main app after email sign-in');
        router.replace('/(tabs)/search');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      addDebugLog(`Error signing in: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  const signInWithGoogle = async () => {
    try {
      addDebugLog('Starting Google sign-in');
      const result = await authService.signInWithGoogle();
      
      if (result?.session) {
        addDebugLog(`Google sign-in successful: ${result.session.user.id}`);
        setUser(result.session.user);
        
        // Check if user needs to go through onboarding
        if (result.session.user.user_metadata?.onboardingComplete === false) {
          addDebugLog('Redirecting to onboarding after Google sign-in');
          router.replace('/onboarding/frequency');
        } else {
          // Direct users to the search tab
          addDebugLog('Redirecting to main app after Google sign-in');
          router.replace('/(tabs)/search');
        }
      } else {
        addDebugLog('Google sign-in completed but no session was created');
        // You can show a debug dialog in development
        if (__DEV__) {
          Alert.alert(
            'Auth Debug',
            'Google sign-in returned success but no session was created. Check console logs.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error with Google sign-in:', error);
      addDebugLog(`Error with Google sign-in: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const signUp = async (data: SignUpData) => {
    try {
      addDebugLog(`Signing up with email: ${data.email}`);
      const { error } = await authService.signUp(data);
      if (error) throw error;
      addDebugLog('Sign-up successful, waiting for email confirmation');
      // Don't automatically sign in after signup - wait for email confirmation
    } catch (error) {
      console.error('Error signing up:', error);
      addDebugLog(`Error signing up: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      addDebugLog('Signing out');
      await authService.signOut();
      setUser(null);
      addDebugLog('Sign-out successful, redirecting to login');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      addDebugLog(`Error signing out: ${error instanceof Error ? error.message : String(error)}`);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  console.log("useAuth called, AuthContext exists:", !!AuthContext);
  const context = useContext(AuthContext);
  console.log("useAuth result:", !!context);
  
  if (context === undefined) {
    console.error("Auth context is undefined when useAuth was called");
    console.error("Stack trace:", new Error().stack);
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 