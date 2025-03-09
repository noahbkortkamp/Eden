import React, { createContext, useContext, useState, useCallback } from 'react';
import { CourseReview, Course, SentimentRating } from '../../types/review';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { createReview, getReviewsForUser, getAllTags } from '../../utils/reviews';
import { format } from 'date-fns';
import { reviewService } from '../../services/reviewService';
import { rankingService } from '../../services/rankingService';

interface ReviewContextType {
  submitReview: (review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  startComparisons: (rating: SentimentRating) => Promise<void>;
  handleComparison: (preferredCourseId: string, otherCourseId: string) => Promise<void>;
  skipComparison: (courseAId: string, courseBId: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

const MAX_COMPARISONS = 3;

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonsRemaining, setComparisonsRemaining] = useState(MAX_COMPARISONS);
  const [originalReviewedCourseId, setOriginalReviewedCourseId] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<Array<{ preferredId: string, otherId: string }>>([]);

  const submitReview = useCallback(async (
    review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the review
      const createdReview = await createReview(
        user.id,
        review.course_id,
        review.rating,
        review.notes,
        review.favorite_holes,
        review.photos,
        review.date_played.toISOString(),
        review.tags || []
      );

      // Get user's reviewed courses with matching sentiment for comparison
      const userReviews = await getReviewsForUser(user.id);
      const reviewedCoursesWithSentiment = userReviews.filter(r => r.rating === review.rating);

      // Check if course already has a ranking
      const rankings = await rankingService.getUserRankings(user.id, review.rating);
      const existingRanking = rankings.find(r => r.course_id === review.course_id);
      
      if (!existingRanking) {
        // Add initial ranking for the new course only if it doesn't exist
        const initialRankPosition = rankings.length + 1;
        await rankingService.addCourseRanking(
          user.id,
          review.course_id,
          review.rating,
          initialRankPosition
        );
      }

      // Filter out the current course from potential comparison courses
      const otherCoursesWithSentiment = reviewedCoursesWithSentiment.filter(
        r => r.course_id !== review.course_id
      );

      if (otherCoursesWithSentiment.length > 0) {
        // Close the review modal first
        router.back();
        
        // Store the original reviewed course ID and reset comparison results
        setOriginalReviewedCourseId(review.course_id);
        setComparisonResults([]);
        
        // Reset comparisons remaining to either MAX_COMPARISONS or the number of available courses
        const totalComparisons = Math.min(otherCoursesWithSentiment.length, MAX_COMPARISONS);
        setComparisonsRemaining(totalComparisons);

        // Get a random course for the first comparison
        const randomCourse = otherCoursesWithSentiment[
          Math.floor(Math.random() * otherCoursesWithSentiment.length)
        ];

        // Then open the comparison modal with the just-reviewed course and a random match
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: review.course_id,
            courseBId: randomCourse.course_id,
            remainingComparisons: totalComparisons,
          },
        });
      } else {
        // No other courses with same sentiment, end the flow
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('Detailed submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [router, user]);

  const startComparisons = useCallback(async (rating: SentimentRating) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      // Get user's reviewed courses with matching sentiment for comparison
      const userReviews = await getReviewsForUser(user.id);
      const reviewedCoursesWithSentiment = userReviews.filter(r => r.rating === rating);
      
      if (reviewedCoursesWithSentiment.length >= 2) {
        const randomCourses = reviewedCoursesWithSentiment
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);

        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: randomCourses[0].course_id,
            courseBId: randomCourses[1].course_id,
            remainingComparisons: comparisonsRemaining,
          },
        });
      } else {
        // Not enough reviewed courses, end the flow and go to feed
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start comparisons');
    }
  }, [comparisonsRemaining, router, user]);

  const handleComparison = useCallback(async (
    preferredCourseId: string,
    otherCourseId: string
  ) => {
    if (!user || !originalReviewedCourseId) {
      router.push('/auth/login');
      return;
    }

    try {
      // Store the comparison result
      setComparisonResults(prev => [
        ...prev,
        { preferredId: preferredCourseId, otherId: otherCourseId }
      ]);

      // Get the original review to know the sentiment category
      const userReviews = await getReviewsForUser(user.id);
      const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
      
      if (originalReview) {
        // Get current rankings and ensure both courses have rankings
        const rankings = await rankingService.getUserRankings(user.id, originalReview.rating);
        const preferredCourseRanking = rankings.find(r => r.course_id === preferredCourseId);
        const otherCourseRanking = rankings.find(r => r.course_id === otherCourseId);

        // If either course doesn't have a ranking, add them
        if (!preferredCourseRanking) {
          await rankingService.addCourseRanking(
            user.id,
            preferredCourseId,
            originalReview.rating,
            rankings.length + 1
          );
        }
        if (!otherCourseRanking) {
          await rankingService.addCourseRanking(
            user.id,
            otherCourseId,
            originalReview.rating,
            rankings.length + (preferredCourseRanking ? 1 : 2)
          );
        }

        // Now that we're sure both courses have rankings, update them
        await rankingService.updateRankingsAfterComparison(
          user.id,
          preferredCourseId,
          otherCourseId,
          originalReview.rating
        );

        const newComparisonsRemaining = comparisonsRemaining - 1;
        setComparisonsRemaining(newComparisonsRemaining);

        if (newComparisonsRemaining > 0) {
          // Get all previously compared courses
          const comparedCourseIds = new Set([
            ...comparisonResults.map(r => r.preferredId),
            ...comparisonResults.map(r => r.otherId),
            preferredCourseId,
            otherCourseId,
            originalReviewedCourseId // Add the original course to exclude it
          ]);
          
          // Get other courses with the same sentiment for comparison, excluding already compared courses
          const otherCoursesWithSentiment = userReviews.filter(r => 
            !comparedCourseIds.has(r.course_id) &&
            r.rating === originalReview.rating
          );

          if (otherCoursesWithSentiment.length > 0) {
            // Get a random course for the next comparison
            const randomCourse = otherCoursesWithSentiment[
              Math.floor(Math.random() * otherCoursesWithSentiment.length)
            ];

            router.push({
              pathname: '/(modals)/comparison',
              params: {
                courseAId: originalReviewedCourseId,
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
              },
            });
            return;
          }
        }

        // If we've completed all comparisons or no more courses to compare, go back to feed
        router.replace('/(tabs)');
      }
      
      // Reset state and go back to feed
      setOriginalReviewedCourseId(null);
      setComparisonResults([]);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Detailed comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit comparison');
      setTimeout(() => {
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        router.replace('/(tabs)');
      }, 2000);
    }
  }, [user, router, comparisonsRemaining, comparisonResults, originalReviewedCourseId]);

  const skipComparison = useCallback((courseAId: string, courseBId: string) => {
    if (!user || !originalReviewedCourseId) {
      router.push('/auth/login');
      return;
    }

    const newComparisonsRemaining = comparisonsRemaining - 1;
    setComparisonsRemaining(newComparisonsRemaining);
    
    if (newComparisonsRemaining > 0) {
      // Get next pair of reviewed courses with matching sentiment
      getReviewsForUser(user.id).then(async userReviews => {
        const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
        
        if (originalReview) {
          // Get all previously compared courses
          const comparedCourseIds = new Set([
            ...comparisonResults.map(r => r.preferredId),
            ...comparisonResults.map(r => r.otherId),
            courseAId,
            courseBId
          ]);

          const otherCoursesWithSentiment = userReviews.filter(r => 
            !comparedCourseIds.has(r.course_id) &&
            r.rating === originalReview.rating
          );
          
          if (otherCoursesWithSentiment.length >= 1) {
            const randomCourse = otherCoursesWithSentiment[
              Math.floor(Math.random() * otherCoursesWithSentiment.length)
            ];

            router.push({
              pathname: '/(modals)/comparison',
              params: {
                courseAId: originalReviewedCourseId,
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
              },
            });
            return;
          }
        }
        
        // Reset state and go to feed
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        router.replace('/(tabs)');
      }).catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to get user reviews');
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        router.replace('/(tabs)');
      });
    } else {
      // End of comparison flow, go to feed
      setOriginalReviewedCourseId(null);
      setComparisonResults([]);
      router.replace('/(tabs)');
    }
  }, [comparisonsRemaining, router, user, originalReviewedCourseId, comparisonResults]);

  return (
    <ReviewContext.Provider
      value={{
        submitReview,
        startComparisons,
        handleComparison,
        skipComparison,
        isSubmitting,
        error,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = () => {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}; 