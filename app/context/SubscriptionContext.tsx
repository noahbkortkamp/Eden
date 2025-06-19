import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { iapService } from '../services/iapService';
import { SubscriptionStatus, FeatureAccess, Product } from '../types/iap';

interface SubscriptionState {
  hasActiveSubscription: boolean;
  subscriptionStatus: SubscriptionStatus;
  expirationDate?: Date;
  isTrialPeriod: boolean;
  productId?: string;
}

interface SubscriptionContextType {
  // State
  subscription: SubscriptionState | null;
  products: Product[];
  loading: boolean;
  error: string | null;
  
  // Operations
  purchaseSubscription: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkFeatureAccess: (feature: string) => Promise<FeatureAccess>;
  trackFeatureUsage: (feature: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  clearError: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const initializationAttempted = useRef(false);

  // Initialize IAP service and load products
  const initializeIAP = async () => {
    if (initializationAttempted.current) {
      return;
    }

    initializationAttempted.current = true;

    try {
      console.log('🚀 SubscriptionContext: Initializing IAP...');
      setLoading(true);
      setError(null);

      // Initialize the IAP service
      await iapService.initialize();

      // Load available products
      const availableProducts = await iapService.loadProducts();
      
      if (isMountedRef.current) {
        setProducts(availableProducts);
        console.log('✅ SubscriptionContext: IAP initialized with products:', availableProducts.length);
      }

    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize IAP';
        setError(errorMessage);
        console.error('❌ SubscriptionContext: IAP initialization failed:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Fetch subscription status
  const fetchSubscriptionStatus = async () => {
    if (!user?.id) {
      setSubscription(null);
      return;
    }

    try {
      console.log('🔍 SubscriptionContext: Fetching subscription status for user:', user.id);
      
      const status = await iapService.getSubscriptionStatus(user.id);
      
      if (isMountedRef.current) {
        setSubscription(status);
        console.log('✅ SubscriptionContext: Subscription status updated:', status);
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription status';
        console.error('❌ SubscriptionContext: Error fetching subscription status:', err);
        // Don't set error for subscription status fetch to avoid blocking UI
        
        // Set default inactive state on error
        setSubscription({
          hasActiveSubscription: false,
          subscriptionStatus: 'inactive',
          isTrialPeriod: false
        });
      }
    }
  };

  // Purchase subscription
  const purchaseSubscription = async (productId: string): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User must be logged in to purchase subscription');
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log(`🛒 SubscriptionContext: Initiating purchase for product: ${productId}`);
      
      const success = await iapService.purchaseSubscription(productId);
      
      if (success) {
        // Refresh subscription status after successful purchase
        await fetchSubscriptionStatus();
        console.log('✅ SubscriptionContext: Purchase completed successfully');
      }
      
      return success;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error('❌ SubscriptionContext: Purchase error:', err);
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Restore purchases
  const restorePurchases = async (): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User must be logged in to restore purchases');
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('🔄 SubscriptionContext: Restoring purchases...');
      
      const restored = await iapService.restorePurchases();
      
      if (restored) {
        // Refresh subscription status after restoration
        await fetchSubscriptionStatus();
        console.log('✅ SubscriptionContext: Purchases restored successfully');
      }
      
      return restored;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error('❌ SubscriptionContext: Restore error:', err);
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Check feature access
  const checkFeatureAccess = async (feature: string): Promise<FeatureAccess> => {
    if (!user?.id) {
      return {
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      };
    }

    try {
      console.log(`🔍 SubscriptionContext: Checking feature access for: ${feature}`);
      const access = await iapService.checkFeatureAccess(user.id, feature);
      console.log(`✅ SubscriptionContext: Feature access result for ${feature}:`, access);
      return access;
      
    } catch (err) {
      console.error(`❌ SubscriptionContext: Error checking feature access for ${feature}:`, err);
      
      // Return restrictive access on error
      return {
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      };
    }
  };

  // Track feature usage
  const trackFeatureUsage = async (feature: string): Promise<void> => {
    if (!user?.id) {
      console.log('⚠️ SubscriptionContext: No user ID for feature usage tracking');
      return;
    }

    try {
      console.log(`📊 SubscriptionContext: Tracking usage for feature: ${feature}`);
      await iapService.trackFeatureUsage(user.id, feature);
      console.log(`✅ SubscriptionContext: Feature usage tracked: ${feature}`);
      
    } catch (err) {
      console.error(`❌ SubscriptionContext: Failed to track feature usage for ${feature}:`, err);
      // Don't throw - usage tracking shouldn't block the user
    }
  };

  // Refresh subscription status
  const refreshSubscription = async (): Promise<void> => {
    await fetchSubscriptionStatus();
  };

  // Clear error
  const clearError = (): void => {
    setError(null);
  };

  // Initialize IAP on mount
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    // Initialize IAP service immediately
    initializeIAP();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, []);

  // Fetch subscription status when user changes
  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      return;
    }

    let isMounted = true;
    isMountedRef.current = true;

    const loadSubscriptionData = async () => {
      try {
        // Ensure IAP is initialized before fetching subscription status
        if (!initializationAttempted.current) {
          await initializeIAP();
        }
        
        // Fetch subscription status
        await fetchSubscriptionStatus();
        
      } catch (err) {
        if (isMounted && isMountedRef.current) {
          console.error('❌ SubscriptionContext: Error loading subscription data:', err);
          // Set default state on error
          setSubscription({
            hasActiveSubscription: false,
            subscriptionStatus: 'inactive',
            isTrialPeriod: false
          });
        }
      }
    };

    loadSubscriptionData();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [user?.id]);

  // Cleanup IAP service on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Cleanup IAP service when provider unmounts
      iapService.cleanup().catch((err) => {
        console.error('❌ SubscriptionContext: Error during IAP cleanup:', err);
      });
    };
  }, []);

  const value: SubscriptionContextType = {
    // State
    subscription,
    products,
    loading,
    error,
    
    // Operations
    purchaseSubscription,
    restorePurchases,
    checkFeatureAccess,
    trackFeatureUsage,
    refreshSubscription,
    clearError
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  
  return context;
}

// Convenience hook that combines subscription context with additional helpers
export function useSubscriptionWithHelpers() {
  const subscription = useSubscriptionContext();
  const { user } = useAuth();

  // Check if user has access to premium features
  const hasPremiumAccess = subscription.subscription?.hasActiveSubscription || false;
  
  // Check if user is in trial period
  const isInTrial = subscription.subscription?.isTrialPeriod || false;
  
  // Get subscription expiration info
  const expirationDate = subscription.subscription?.expirationDate;
  const daysUntilExpiration = expirationDate 
    ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;

  return {
    ...subscription,
    // Additional helpers
    hasPremiumAccess,
    isInTrial,
    expirationDate,
    daysUntilExpiration,
    isExpiringSoon,
    isLoggedIn: !!user
  };
} 