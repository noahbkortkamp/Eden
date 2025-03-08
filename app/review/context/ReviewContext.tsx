import React, { createContext, useContext, useState, useCallback } from 'react';
import { CourseReview, Course, SentimentRating } from '../../types/review';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { createReview, getReviewsForUser, getAllTags } from '../../utils/reviews';
import { format } from 'date-fns';
import { reviewService } from '../../services/reviewService';

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
      // Check for existing review on the same date
      const userReviews = await getReviewsForUser(user.id);
      const existingReview = userReviews.find(r => 
        r.course_id === review.course_id && 
        format(new Date(r.date_played), 'yyyy-MM-dd') === format(new Date(review.date_played), 'yyyy-MM-dd')
      );

      if (existingReview) {
        throw new Error(`You've already reviewed this course for ${format(new Date(review.date_played), 'MMMM d, yyyy')}. Please choose a different date.`);
      }

      // Get all available tags to map frontend IDs to database UUIDs
      const allTags = await getAllTags();
      const tagMap = new Map(allTags.map(tag => [tag.name, tag.id]));
      
      // Map frontend tag IDs to database UUIDs
      const tagUuids = review.tags
        ?.map(tagId => {
          // The frontend now uses the exact tag names as IDs
          return tagMap.get(tagId);
        })
        .filter((uuid): uuid is string => uuid !== undefined) || [];

      // Format favorite holes to be just numbers
      const favoriteHoleNumbers = review.favorite_holes.map(hole => 
        typeof hole === 'number' ? hole : hole.number
      );

      // Submit review with user ID
      await createReview(
        user.id,
        review.course_id,
        review.rating,
        review.notes,
        favoriteHoleNumbers,
        review.photos,
        review.date_played.toISOString(),
        tagUuids
      );

      // Reset comparisons count for new review
      setComparisonsRemaining(MAX_COMPARISONS);

      // Get updated reviews including the one just submitted
      const updatedReviews = await getReviewsForUser(user.id);
      
      // Find other courses with the same rating
      const reviewedCoursesWithSentiment = updatedReviews.filter(r => 
        r.course_id !== review.course_id && 
        r.rating === review.rating
      );
      
      if (reviewedCoursesWithSentiment.length >= 1) {
        // Close the review modal first
        router.back();
        
        // Store the original reviewed course ID
        setOriginalReviewedCourseId(review.course_id);
        
        // Get a random course to compare with the just-reviewed course
        const randomCourse = reviewedCoursesWithSentiment[
          Math.floor(Math.random() * reviewedCoursesWithSentiment.length)
        ];

        // Then open the comparison modal with the just-reviewed course and a random match
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: review.course_id, // Always show the just-reviewed course first
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
      console.log('Starting comparison submission:', {
        userId: user.id,
        preferredCourseId,
        otherCourseId,
        originalReviewedCourseId
      });

      // Validate input parameters
      if (!preferredCourseId || !otherCourseId) {
        throw new Error('Missing course IDs');
      }

      if (preferredCourseId === otherCourseId) {
        throw new Error('Cannot compare a course with itself');
      }

      // Save the comparison to the database
      await reviewService.submitComparison(user.id, preferredCourseId, otherCourseId);

      // Get user's reviewed courses
      const userReviews = await getReviewsForUser(user.id);
      const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
      
      if (originalReview) {
        const newComparisonsRemaining = comparisonsRemaining - 1;
        setComparisonsRemaining(newComparisonsRemaining);

        if (newComparisonsRemaining > 0) {
          // Get other courses with the same sentiment, excluding the ones we just compared
          const otherCoursesWithSentiment = userReviews.filter(r => 
            r.course_id !== preferredCourseId && 
            r.course_id !== otherCourseId && 
            r.course_id !== originalReviewedCourseId &&
            r.rating === originalReview.rating
          );

          if (otherCoursesWithSentiment.length >= 1) {
            // Get a random course to compare with the original reviewed course
            const randomCourse = otherCoursesWithSentiment[
              Math.floor(Math.random() * otherCoursesWithSentiment.length)
            ];

            router.push({
              pathname: '/(modals)/comparison',
              params: {
                courseAId: originalReviewedCourseId, // Always show the original reviewed course
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
              },
            });
            return;
          }
        }
      }
      
      // If we can't find matching sentiment courses or reached max comparisons,
      // end the flow and go to feed
      setOriginalReviewedCourseId(null); // Reset the original course ID
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Detailed comparison error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : 'Failed to submit comparison');
      // After error, wait 2 seconds then go back to feed
      setTimeout(() => {
        setOriginalReviewedCourseId(null); // Reset the original course ID
        router.replace('/(tabs)');
      }, 2000);
    }
  }, [user, router, comparisonsRemaining, setComparisonsRemaining, originalReviewedCourseId]);

  const skipComparison = useCallback((courseAId: string, courseBId: string) => {
    if (!user || !originalReviewedCourseId) {
      router.push('/auth/login');
      return;
    }

    const newComparisonsRemaining = comparisonsRemaining - 1;
    setComparisonsRemaining(newComparisonsRemaining);
    
    if (newComparisonsRemaining > 0) {
      // Get next pair of reviewed courses with matching sentiment
      getReviewsForUser(user.id).then(userReviews => {
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
                courseAId: originalReviewedCourseId, // Always show the original reviewed course
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
              },
            });
            return;
          }
        }
        
        // If we can't find matching sentiment courses or something went wrong,
        // end the flow and go to feed
        setOriginalReviewedCourseId(null); // Reset the original course ID
        router.replace('/(tabs)');
      }).catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to get user reviews');
        setOriginalReviewedCourseId(null); // Reset the original course ID
        router.replace('/(tabs)');
      });
    } else {
      // End of comparison flow, go to feed
      setOriginalReviewedCourseId(null); // Reset the original course ID
      router.replace('/(tabs)');
    }
  }, [comparisonsRemaining, router, user, originalReviewedCourseId]);

  const value = {
    submitReview,
    startComparisons,
    handleComparison,
    skipComparison,
    isSubmitting,
    error,
  };

  return (
    <ReviewContext.Provider value={value}>
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