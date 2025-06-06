import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import * as authService from '../services/auth';
import { useRouter } from 'expo-router';
import { SignUpData } from '../services/auth';
import { Alert } from 'react-native';
import { reviewService } from '../services/reviewService';
import { userService } from '../services/userService';

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
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
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
      
      // First try getting the current session
      const session = await authService.getSession();
      addDebugLog(`Session check: ${session ? 'active session found' : 'no active session'}`);
      
      // Then get the user details
      const user = await authService.getCurrentUser();
      addDebugLog(`User check: ${user ? `found user (id: ${user.id})` : 'no user found'}`);
      
      if (user) {
        // Log user metadata for debugging
        addDebugLog(`User metadata: ${JSON.stringify(user.user_metadata || {})}`);
        setUser(user);
        
        // Only show onboarding for new users who have NEVER completed onboarding
        // If onboardingComplete is explicitly false, show onboarding
        // If onboardingComplete doesn't exist or is true, go to lists tab
        if (user.user_metadata?.onboardingComplete === false) {
          addDebugLog('Redirecting to onboarding');
          router.replace('/onboarding/profile-info');
        } else {
          // If user is authenticated and doesn't need onboarding, ensure they go to lists tab
          addDebugLog('User is authenticated and onboarding is complete, directing to lists tab');
          router.replace('/(tabs)/lists');
        }
      } else if (session) {
        // We have a session but no user - try to recover
        addDebugLog('Session exists but user is null - attempting to refresh session');
        try {
          const { data: refreshData, error: refreshError } = await authService.refreshSession();
          
          if (refreshError) {
            addDebugLog(`Session refresh failed: ${refreshError.message}`);
          } else if (refreshData?.user) {
            addDebugLog(`Session refresh successful, user id: ${refreshData.user.id}`);
            setUser(refreshData.user);
            
            // Only redirect to onboarding if explicitly marked as false
            if (refreshData.user.user_metadata?.onboardingComplete === false) {
              router.replace('/onboarding/profile-info');
            } else {
              // Otherwise direct to lists tab - even if onboardingComplete is undefined
              router.replace('/(tabs)/lists');
            }
          }
        } catch (refreshError) {
          addDebugLog(`Exception in session refresh: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
        }
      }
    } catch (error) {
      addDebugLog(`Error checking user: ${error instanceof Error ? error.message : String(error)}`);
      console.error('AuthContext checkUser error:', error);
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
        router.replace('/onboarding/profile-info');
        return;
      }
      
      // Check if the user has any reviews or has completed first review
      if (user) {
        try {
          // Check review count
          const reviewCount = await reviewService.getUserReviewCount(user.id);
          
          // Check if first review has been completed via metadata
          const hasCompletedFirstReview = await userService.hasCompletedFirstReview(user.id);
          
          addDebugLog(`User has ${reviewCount} reviews, firstReviewCompleted: ${hasCompletedFirstReview}`);
          
          // Only show first review screen if they have 0 reviews AND haven't completed first review
          if (reviewCount === 0 && !hasCompletedFirstReview) {
            // First time user with no reviews - direct to first review screen
            addDebugLog('User has 0 reviews and no firstReviewCompleted flag, redirecting to first-review screen');
            router.replace('/(auth)/first-review');
            return;
          }
        } catch (error) {
          console.error('Error checking user review status:', error);
          // Continue with normal flow on error
        }
      }
      
      // Direct users to the lists tab
      addDebugLog('Redirecting to main app after email sign-in');
      router.replace('/(tabs)/lists');
    } catch (error) {
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
          router.replace('/onboarding/profile-info');
          return;
        }
        
        // Check if user has any reviews or has completed first review
        try {
          // Check review count
          const reviewCount = await reviewService.getUserReviewCount(result.session.user.id);
          
          // Check if first review has been completed via metadata
          const hasCompletedFirstReview = await userService.hasCompletedFirstReview(result.session.user.id);
          
          addDebugLog(`User has ${reviewCount} reviews, firstReviewCompleted: ${hasCompletedFirstReview}`);
          
          // Only show first review screen if they have 0 reviews AND haven't completed first review
          if (reviewCount === 0 && !hasCompletedFirstReview) {
            // First time user with no reviews - direct to first review screen
            addDebugLog('User has 0 reviews and no firstReviewCompleted flag, redirecting to first-review screen');
            router.replace('/(auth)/first-review');
            return;
          }
        } catch (error) {
          console.error('Error checking user review status:', error);
          // Continue with normal flow on error
        }
        
        // Direct users to the lists tab
        addDebugLog('Redirecting to main app after Google sign-in');
        router.replace('/(tabs)/lists');
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
      addDebugLog(`Error with Google sign-in: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      addDebugLog('Starting Apple sign-in');
      const result = await authService.signInWithApple();
      
      if (result?.session) {
        addDebugLog(`Apple sign-in successful: ${result.session.user.id}`);
        setUser(result.session.user);
        
        // Check if user needs to go through onboarding
        if (result.session.user.user_metadata?.onboardingComplete === false) {
          addDebugLog('Redirecting to onboarding after Apple sign-in');
          router.replace('/onboarding/profile-info');
          return;
        }
        
        // Check if user has any reviews or has completed first review
        try {
          // Check review count
          const reviewCount = await reviewService.getUserReviewCount(result.session.user.id);
          
          // Check if first review has been completed via metadata
          const hasCompletedFirstReview = await userService.hasCompletedFirstReview(result.session.user.id);
          
          addDebugLog(`User has ${reviewCount} reviews, firstReviewCompleted: ${hasCompletedFirstReview}`);
          
          // Only show first review screen if they have 0 reviews AND haven't completed first review
          if (reviewCount === 0 && !hasCompletedFirstReview) {
            // First time user with no reviews - direct to first review screen
            addDebugLog('User has 0 reviews and no firstReviewCompleted flag, redirecting to first-review screen');
            router.replace('/(auth)/first-review');
            return;
          }
        } catch (error) {
          console.error('Error checking user review status:', error);
          // Continue with normal flow on error
        }
        
        // Direct users to the lists tab
        addDebugLog('Redirecting to main app after Apple sign-in');
        router.replace('/(tabs)/lists');
      } else {
        addDebugLog('Apple sign-in completed but no session was created');
        // You can show a debug dialog in development
        if (__DEV__) {
          Alert.alert(
            'Auth Debug',
            'Apple sign-in returned success but no session was created. Check console logs.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      addDebugLog(`Error with Apple sign-in: ${error instanceof Error ? error.message : String(error)}`);
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
    signInWithApple,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 