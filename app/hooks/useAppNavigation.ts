import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { useFirstReviewCheck } from './useFirstReviewCheck';

type NavigationState = 'idle' | 'checking' | 'navigating' | 'complete';
type NavigationRoute = 
  | '/auth/welcome'
  | '/onboarding/profile-info'
  | '/auth/first-review'
  | '/(tabs)/lists';

interface UseAppNavigationResult {
  navigationState: NavigationState;
  shouldShowLoading: boolean;
  error: string | null;
}

interface UseAppNavigationParams {
  user: User | null;
  loading: boolean;
}

/**
 * Custom hook to handle app navigation logic with stable references
 * Prevents React hooks violations by ensuring consistent hook order
 */
export function useAppNavigation({ user, loading }: UseAppNavigationParams): UseAppNavigationResult {
  const router = useRouter();
  const [navigationState, setNavigationState] = useState<NavigationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const hasNavigatedRef = useRef(false);

  // Always call useFirstReviewCheck - this ensures consistent hook order
  const firstReviewCheck = useFirstReviewCheck(user?.id || null);

  // Check if profile is complete
  const profileComplete = user?.user_metadata?.onboardingComplete !== false;

  // Stable navigation function with ref-based guards
  const navigateToRoute = useCallback(async (route: NavigationRoute) => {
    if (!isMountedRef.current || hasNavigatedRef.current) {
      return;
    }

    try {
      console.log(`🔍 useAppNavigation: Navigating to ${route}`);
      setNavigationState('navigating');
      hasNavigatedRef.current = true;
      
      // Use replace to prevent back navigation to index
      router.replace(route as any);
      
      // Mark navigation as complete after a brief delay to allow router to process
      setTimeout(() => {
        if (isMountedRef.current) {
          setNavigationState('complete');
        }
      }, 100);
    } catch (err) {
      console.error('🔍 useAppNavigation: Navigation error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Navigation failed');
        setNavigationState('idle');
        hasNavigatedRef.current = false;
      }
    }
  }, [router]);

  // Main navigation effect - always runs, ensuring consistent hook order
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    const determineNavigation = async () => {
      // Don't proceed if auth is still loading or we've already navigated
      if (loading || hasNavigatedRef.current || navigationState === 'complete') {
        return;
      }

      // Don't proceed if first review check is still loading
      if (user && firstReviewCheck.loading) {
        return;
      }

      if (!isMounted || !isMountedRef.current) {
        return;
      }

      try {
        setNavigationState('checking');
        setError(null);

        // Navigation logic with clear priority order
        if (!user) {
          console.log('🔍 useAppNavigation: No user, redirecting to welcome');
          await navigateToRoute('/auth/welcome');
        } else if (!profileComplete) {
          console.log('🔍 useAppNavigation: Profile incomplete, redirecting to onboarding');
          await navigateToRoute('/onboarding/profile-info');
        } else if (firstReviewCheck.needsFirstReview && !firstReviewCheck.loading) {
          console.log('🔍 useAppNavigation: User needs first review, redirecting to first-review');
          await navigateToRoute('/auth/first-review');
        } else if (!firstReviewCheck.loading) {
          console.log('🔍 useAppNavigation: User ready for main app, redirecting to lists');
          await navigateToRoute('/(tabs)/lists');
        }
      } catch (err) {
        if (isMounted && isMountedRef.current) {
          console.error('🔍 useAppNavigation: Error in navigation determination:', err);
          setError(err instanceof Error ? err.message : 'Navigation error');
          // Fallback to main app on error
          await navigateToRoute('/(tabs)/lists');
        }
      }
    };

    determineNavigation();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [
    user,
    loading,
    profileComplete,
    firstReviewCheck.needsFirstReview,
    firstReviewCheck.loading,
    navigationState,
    navigateToRoute
  ]);

  // Reset navigation state when user changes
  useEffect(() => {
    hasNavigatedRef.current = false;
    setNavigationState('idle');
    setError(null);
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Determine if we should show loading spinner
  const shouldShowLoading = loading || 
    navigationState === 'checking' || 
    navigationState === 'navigating' ||
    (user && firstReviewCheck.loading) ||
    false;

  // Include first review check error in overall error state
  const combinedError = error || firstReviewCheck.error;

  return {
    navigationState,
    shouldShowLoading,
    error: combinedError
  };
} 