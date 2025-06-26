import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkReviewLimit } from '../utils/subscription';

interface ReviewLimitResult {
  canSubmitReview: boolean;
  totalReviews: number;
  reviewLimit: number;
  requiresUpgrade: boolean;
  subscriptionStatus: string;
  isLoading: boolean;
  error: string | null;
  checkLimit: () => Promise<void>;
}

/**
 * Hook to check if user can submit more reviews
 * Checks against the 15-review limit for free/trial users
 */
export function useReviewLimit(): ReviewLimitResult {
  const { user } = useAuth();
  const [canSubmitReview, setCanSubmitReview] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewLimit, setReviewLimit] = useState(15);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLimit = useCallback(async () => {
    if (!user?.id) {
      setCanSubmitReview(false);
      setRequiresUpgrade(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 useReviewLimit: Checking review limits for user:', user.id);
      
      const result = await checkReviewLimit(user.id);
      
      setCanSubmitReview(result.canSubmitReview);
      setTotalReviews(result.totalReviews);
      setReviewLimit(result.reviewLimit);
      setRequiresUpgrade(result.requiresUpgrade);
      setSubscriptionStatus(result.subscriptionStatus);
      
      console.log(`✅ useReviewLimit: Result - ${result.totalReviews}/${result.reviewLimit} reviews, canSubmit: ${result.canSubmitReview}`);
      
    } catch (err) {
      console.error('❌ useReviewLimit: Error checking limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to check review limits');
      
      // Set restrictive defaults on error
      setCanSubmitReview(false);
      setRequiresUpgrade(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Check limits when user changes
  useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  return {
    canSubmitReview,
    totalReviews,
    reviewLimit,
    requiresUpgrade,
    subscriptionStatus,
    isLoading,
    error,
    checkLimit,
  };
} 