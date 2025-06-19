import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { iapService } from '../services/iapService';
import { SubscriptionStatus, FeatureAccess } from '../types/iap';

interface SubscriptionState {
  hasActiveSubscription: boolean;
  subscriptionStatus: SubscriptionStatus;
  expirationDate?: Date;
  isTrialPeriod: boolean;
  productId?: string;
}

interface UseSubscriptionResult {
  subscription: SubscriptionState | null;
  loading: boolean;
  error: string | null;
  checkFeatureAccess: (feature: string) => Promise<FeatureAccess>;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  trackFeatureUsage: (feature: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage subscription status and operations
 * Follows the existing hook patterns in the app
 */
export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useSubscription: Fetching subscription status for user:', user.id);
      
      const status = await iapService.getSubscriptionStatus(user.id);
      
      if (isMountedRef.current) {
        setSubscription(status);
        console.log('✅ useSubscription: Subscription status updated:', status);
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription status';
        setError(errorMessage);
        console.error('❌ useSubscription: Error fetching subscription status:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  // Check feature access
  const checkFeatureAccess = useCallback(async (feature: string): Promise<FeatureAccess> => {
    if (!user?.id) {
      return {
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      };
    }

    try {
      console.log(`🔍 useSubscription: Checking feature access for: ${feature}`);
      const access = await iapService.checkFeatureAccess(user.id, feature);
      console.log(`✅ useSubscription: Feature access result for ${feature}:`, access);
      return access;
      
    } catch (err) {
      console.error(`❌ useSubscription: Error checking feature access for ${feature}:`, err);
      
      // Return restrictive access on error
      return {
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      };
    }
  }, [user?.id]);

  // Purchase subscription
  const purchaseSubscription = useCallback(async (productId: string): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User must be logged in to purchase subscription');
    }

    try {
      setError(null);
      console.log(`🛒 useSubscription: Initiating purchase for product: ${productId}`);
      
      const success = await iapService.purchaseSubscription(productId);
      
      if (success) {
        // Refresh subscription status after successful purchase
        await fetchSubscriptionStatus();
        console.log('✅ useSubscription: Purchase completed, subscription status refreshed');
      }
      
      return success;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      setError(errorMessage);
      console.error('❌ useSubscription: Purchase error:', err);
      throw err;
    }
  }, [user?.id, fetchSubscriptionStatus]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User must be logged in to restore purchases');
    }

    try {
      setError(null);
      console.log('🔄 useSubscription: Restoring purchases...');
      
      const restored = await iapService.restorePurchases();
      
      if (restored) {
        // Refresh subscription status after restoration
        await fetchSubscriptionStatus();
        console.log('✅ useSubscription: Purchases restored, subscription status refreshed');
      }
      
      return restored;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      setError(errorMessage);
      console.error('❌ useSubscription: Restore error:', err);
      throw err;
    }
  }, [user?.id, fetchSubscriptionStatus]);

  // Track feature usage
  const trackFeatureUsage = useCallback(async (feature: string): Promise<void> => {
    if (!user?.id) {
      console.log('⚠️ useSubscription: No user ID for feature usage tracking');
      return;
    }

    try {
      console.log(`📊 useSubscription: Tracking usage for feature: ${feature}`);
      await iapService.trackFeatureUsage(user.id, feature);
      console.log(`✅ useSubscription: Feature usage tracked: ${feature}`);
      
    } catch (err) {
      console.error(`❌ useSubscription: Failed to track feature usage for ${feature}:`, err);
      // Don't throw - usage tracking shouldn't block the user
    }
  }, [user?.id]);

  // Refetch subscription status
  const refetch = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Effect to fetch subscription status when user changes
  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    isMountedRef.current = true;

    const initializeSubscription = async () => {
      try {
        // Initialize IAP service if needed
        await iapService.initialize();
        
        // Fetch subscription status
        await fetchSubscriptionStatus();
        
      } catch (err) {
        if (isMounted && isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize subscription';
          setError(errorMessage);
          console.error('❌ useSubscription: Initialization error:', err);
        }
      }
    };

    initializeSubscription();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [user?.id, fetchSubscriptionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    subscription,
    loading,
    error,
    checkFeatureAccess,
    purchaseSubscription,
    restorePurchases,
    trackFeatureUsage,
    refetch
  };
}

/**
 * Hook to check access to a specific feature
 * Useful for components that need to check a single feature
 */
export function useFeatureAccess(feature: string) {
  const { user } = useAuth();
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const checkAccess = useCallback(async () => {
    if (!user?.id) {
      setAccess({
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 useFeatureAccess: Checking access for feature: ${feature}`);
      
      const result = await iapService.checkFeatureAccess(user.id, feature);
      
      if (isMountedRef.current) {
        setAccess(result);
        console.log(`✅ useFeatureAccess: Access result for ${feature}:`, result);
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check feature access';
        setError(errorMessage);
        console.error(`❌ useFeatureAccess: Error checking access for ${feature}:`, err);
        
        // Set restrictive access on error
        setAccess({
          hasAccess: false,
          isPremiumFeature: true,
          usageCount: 0,
          limitReached: true
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, feature]);

  // Track usage when feature is accessed
  const trackUsage = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log(`📊 useFeatureAccess: Tracking usage for feature: ${feature}`);
      await iapService.trackFeatureUsage(user.id, feature);
      
      // Refresh access status after tracking usage
      await checkAccess();
      
    } catch (err) {
      console.error(`❌ useFeatureAccess: Failed to track usage for ${feature}:`, err);
      // Don't throw - usage tracking shouldn't block the user
    }
  }, [user?.id, feature, checkAccess]);

  // Effect to check access when user or feature changes
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    checkAccess();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [checkAccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    access,
    loading,
    error,
    checkAccess,
    trackUsage
  };
} 