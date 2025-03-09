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

      // Add initial ranking for the new course
      const initialRankPosition = reviewedCoursesWithSentiment.length + 1;
      await rankingService.addCourseRanking(
        user.id,
        review.course_id,
        review.rating,
        initialRankPosition
      );

      if (reviewedCoursesWithSentiment.length >= 1) {
        // Close the review modal first
        router.back();
        
        // Store the original reviewed course ID and reset comparison results
        setOriginalReviewedCourseId(review.course_id);
        setComparisonResults([]);
        
        // Get a random course to compare with the just-reviewed course
        const randomCourse = reviewedCoursesWithSentiment[
          Math.floor(Math.random() * reviewedCoursesWithSentiment.length)
        ];

        // Add initial ranking for the comparison course if it doesn't exist
        const rankings = await rankingService.getUserRankings(user.id, review.rating);
        const randomCourseRanking = rankings.find(r => r.course_id === randomCourse.course_id);
        if (!randomCourseRanking) {
          await rankingService.addCourseRanking(
            user.id,
            randomCourse.course_id,
            review.rating,
            initialRankPosition + 1
          );
        }

        // Then open the comparison modal with the just-reviewed course and a random match
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: review.course_id,
            courseBId: randomCourse.course_id,
            remainingComparisons: MAX_COMPARISONS,
          },
        });
      } else {
        // Not enough reviewed courses for comparison, end the flow and go to feed
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
        // Ensure both courses have rankings before comparison
        const rankings = await rankingService.getUserRankings(user.id, originalReview.rating);
        const preferredCourseRanking = rankings.find(r => r.course_id === preferredCourseId);
        const otherCourseRanking = rankings.find(r => r.course_id === otherCourseId);

        // Add or update rankings
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

        // Update rankings based on comparison
        await rankingService.updateRankingsAfterComparison(
          user.id,
          preferredCourseId,
          otherCourseId,
          originalReview.rating
        );

        const newComparisonsRemaining = comparisonsRemaining - 1;
        setComparisonsRemaining(newComparisonsRemaining);

        if (newComparisonsRemaining > 0) {
          // Get other courses with the same sentiment for comparison
          const otherCoursesWithSentiment = userReviews.filter(r => 
            r.course_id !== preferredCourseId && 
            r.course_id !== otherCourseId && 
            r.course_id !== originalReviewedCourseId &&
            r.rating === originalReview.rating
          );

          if (otherCoursesWithSentiment.length >= 1) {
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

        // If we've completed all comparisons, update the final ranking
        const finalPosition = await rankingService.findRankPosition(
          user.id,
          originalReviewedCourseId,
          originalReview.rating,
          comparisonResults
        );

        // Get a course to compare with that's in the desired position
        const courseInPosition = rankings.find(r => r.rank_position === finalPosition);
        
        if (courseInPosition) {
          // Update the ranking by comparing with the course in the desired position
          await rankingService.updateRankingsAfterComparison(
            user.id,
            originalReviewedCourseId,
            courseInPosition.course_id,
            originalReview.rating
          );
        }
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
          const otherCoursesWithSentiment = userReviews.filter(r => 
            r.course_id !== courseAId && 
            r.course_id !== courseBId && 
            r.course_id !== originalReviewedCourseId &&
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

          // If we've skipped all comparisons, just use the initial ranking
          await rankingService.addCourseRanking(
            user.id,
            originalReviewedCourseId,
            originalReview.rating,
            userReviews.filter(r => r.rating === originalReview.rating).length
          );
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
  }, [comparisonsRemaining, router, user, originalReviewedCourseId]);

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