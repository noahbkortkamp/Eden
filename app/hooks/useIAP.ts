import { useState, useEffect } from 'react';
import { iapService } from '../services/iapService';
import { useSubscription } from './useSubscription';

interface UseIAPResult {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  canPurchase: boolean;
  status: {
    isInitialized: boolean;
    configurationValid: boolean;
    canPurchase: boolean;
    environment: string;
  } | null;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  refreshStatus: () => void;
  retryInitialization: () => Promise<void>;
}

export const useIAP = (): UseIAPResult => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<UseIAPResult['status']>(null);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const { refetch: refreshSubscription } = useSubscription();

  const refreshStatus = () => {
    try {
      if (!iapService || typeof iapService.getStatus !== 'function') {
        console.error('❌ useIAP: iapService not properly initialized');
        setError('Payment system not available');
        return null;
      }

      const currentStatus = iapService.getStatus();
      setStatus(currentStatus);
      setIsInitialized(currentStatus.isInitialized);
      return currentStatus;
    } catch (err) {
      console.error('❌ useIAP: Error refreshing status:', err);
      setError('Failed to refresh payment status');
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeIAP = async () => {
      if (initializationAttempted || isLoading) {
        console.log('🔄 useIAP: Skipping initialization - already attempted or in progress');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setInitializationAttempted(true);
        
        console.log('🚀 useIAP: Starting IAP initialization...');
        
        if (!iapService || typeof iapService.initialize !== 'function') {
          throw new Error('Payment service not available');
        }

        await iapService.initialize();
        
        // Get updated status after initialization
        if (isMounted) {
          const newStatus = refreshStatus();
          console.log('✅ useIAP: IAP initialization completed');
          console.log('🔍 useIAP: Status:', newStatus);
        }
        
      } catch (err) {
        console.error('❌ useIAP: Initialization failed:', err);
        
        if (isMounted) {
          // Get status even if initialization failed (for graceful degradation)
          const currentStatus = refreshStatus();
          
          // In production, don't show initialization errors to users unless critical
          if (__DEV__) {
            setError(err instanceof Error ? err.message : 'Payment system initialization failed');
          } else {
            // Only set error if we can't proceed at all
            if (!currentStatus?.canPurchase) {
              setError('Payment system temporarily unavailable');
            }
          }
        }
        
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initialize only once when component mounts
    initializeIAP();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (isInitialized && iapService && typeof iapService.cleanup === 'function') {
        iapService.cleanup().catch(err => {
          console.error('useIAP: Cleanup error:', err);
        });
      }
    };
  }, []);

  const retryInitialization = async (): Promise<void> => {
    console.log('🔄 useIAP: Manual retry initialization requested');
    
    try {
      if (!iapService || typeof iapService.initialize !== 'function') {
        throw new Error('Payment service not available');
      }

      setInitializationAttempted(false);
      setError(null);
      setIsLoading(true);
      
      await iapService.initialize();
      const newStatus = refreshStatus();
      console.log('✅ useIAP: Manual retry initialization completed');
      console.log('🔍 useIAP: Status:', newStatus);
    } catch (err) {
      console.error('❌ useIAP: Manual retry initialization failed:', err);
      const currentStatus = refreshStatus();
      if (__DEV__) {
        setError(err instanceof Error ? err.message : 'Payment system initialization failed');
      } else if (!currentStatus?.canPurchase) {
        setError('Payment system temporarily unavailable');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseSubscription = async (productId: string): Promise<boolean> => {
    try {
      setError(null);
      
      console.log(`🛒 useIAP: Initiating purchase for product: ${productId}`);
      
      if (!productId || typeof productId !== 'string') {
        throw new Error('Invalid product ID');
      }

      if (!iapService || typeof iapService.purchaseSubscription !== 'function') {
        throw new Error('Payment service not available');
      }

      if (!iapService || typeof iapService.getStatus !== 'function') {
        throw new Error('Payment service not properly initialized');
      }

      // Check current status before purchase
      const currentStatus = refreshStatus();
      
      if (!currentStatus?.canPurchase && !initializationAttempted) {
        console.log('🔄 useIAP: IAP not ready, attempting one-time retry...');
        await retryInitialization();
        
        // Check again after retry
        const retryStatus = refreshStatus();
        if (!retryStatus?.canPurchase) {
          throw new Error('Payment system is not ready. Please try again in a moment.');
        }
      } else if (!currentStatus?.canPurchase) {
        throw new Error('Payment system is not ready. Please try again in a moment.');
      }

      const success = await iapService.purchaseSubscription(productId);
      
      if (success) {
        console.log('✅ useIAP: Purchase completed successfully');
        
        // Refresh subscription status after successful purchase
        console.log('🔄 useIAP: Refreshing subscription status after purchase...');
        
        if (refreshSubscription && typeof refreshSubscription === 'function') {
          setTimeout(() => {
            refreshSubscription();
          }, 2000); // Small delay to ensure Apple's servers are updated
        } else {
          console.warn('⚠️ useIAP: refreshSubscription not available');
        }
      }
      
      return success;
      
    } catch (err) {
      console.error('❌ useIAP: Purchase failed:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
      throw err;
    }
  };

  return {
    isInitialized,
    isLoading,
    error,
    canPurchase: status?.canPurchase || false,
    status,
    purchaseSubscription,
    refreshStatus,
    retryInitialization,
  };
}; 