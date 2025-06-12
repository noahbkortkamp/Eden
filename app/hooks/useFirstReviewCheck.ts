import { useState, useEffect, useRef } from 'react';
import { reviewService } from '../services/reviewService';
import { userService } from '../services/userService';
import { errorHandler } from '../utils/errorHandling';

interface FirstReviewCheckResult {
  reviewCount: number | null;
  hasCompletedFirstReview: boolean | null;
  needsFirstReview: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to check if user needs to complete their first review
 * Handles async operations with proper cleanup and stable references
 */
export function useFirstReviewCheck(userId: string | null): FirstReviewCheckResult {
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [hasCompletedFirstReview, setHasCompletedFirstReview] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Reset state when userId changes
  useEffect(() => {
    if (!userId) {
      setReviewCount(null);
      setHasCompletedFirstReview(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    isMountedRef.current = true;

    const checkFirstReviewStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 useFirstReviewCheck: Checking first review status for user:', userId);

        // Run both checks in parallel for efficiency
        const [count, hasCompleted] = await Promise.all([
          reviewService.getUserReviewCount(userId),
          userService.hasCompletedFirstReview(userId)
        ]);

        if (isMounted && isMountedRef.current) {
          setReviewCount(count);
          setHasCompletedFirstReview(hasCompleted);
          console.log(`🔍 useFirstReviewCheck: User has ${count} reviews, first review completed: ${hasCompleted}`);
        }
      } catch (err) {
        if (isMounted && isMountedRef.current) {
          const handledError = errorHandler.handle(err, {
            context: 'useFirstReviewCheck',
            userId
          });
          setError(handledError.message);
          console.error('🔍 useFirstReviewCheck: Error checking first review status:', handledError);
        }
      } finally {
        if (isMounted && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkFirstReviewStatus();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate if user needs first review based on current state
  const needsFirstReview = reviewCount === 0 && hasCompletedFirstReview === false;

  return {
    reviewCount,
    hasCompletedFirstReview,
    needsFirstReview,
    loading,
    error
  };
} 