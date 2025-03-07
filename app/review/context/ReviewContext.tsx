import React, { createContext, useContext, useState, useCallback } from 'react';
import { CourseReview, Course, SentimentRating } from '../../types/review';
import { mockCourses } from '../../api/mockData';
import { useRouter } from 'expo-router';

interface ReviewContextType {
  submitReview: (review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  startComparisons: (rating: SentimentRating) => Promise<void>;
  handleComparison: (preferredCourseId: string, otherCourseId: string) => Promise<void>;
  skipComparison: () => void;
  isSubmitting: boolean;
  error: string | null;
}

const MAX_COMPARISONS = 3;

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonsRemaining, setComparisonsRemaining] = useState(MAX_COMPARISONS);

  const submitReview = useCallback(async (
    review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Mock review submission
      console.log('Submitting review:', review);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset comparisons count for new review
      setComparisonsRemaining(MAX_COMPARISONS);

      // Close the review modal first
      router.back();

      // For positive reviews, start the comparison flow
      if (review.rating === 'liked') {
        // Get two random courses for comparison
        const availableCourses = mockCourses.filter(c => 
          c.course_id !== review.course_id && 
          c.average_rating > 4.0
        );
        
        if (availableCourses.length >= 2) {
          const randomCourses = availableCourses
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

          // Then open the comparison modal
          router.push({
            pathname: '/(modals)/comparison',
            params: {
              courseAId: randomCourses[0].course_id,
              courseBId: randomCourses[1].course_id,
              remainingComparisons: MAX_COMPARISONS,
            },
          });
        } else {
          // If not enough courses for comparison, go to feed
          router.push('/(tabs)');
        }
      } else {
        // For neutral or negative reviews, go back to feed
        router.push('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [router]);

  const startComparisons = useCallback(async (rating: SentimentRating) => {
    try {
      // Get two random courses for comparison
      const availableCourses = mockCourses.filter(c => c.average_rating > 4.0);
      const randomCourses = availableCourses
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      
      if (randomCourses.length >= 2) {
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: randomCourses[0].course_id,
            courseBId: randomCourses[1].course_id,
            remainingComparisons: comparisonsRemaining,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start comparisons');
    }
  }, [comparisonsRemaining, router]);

  const handleComparison = useCallback(async (
    preferredCourseId: string,
    otherCourseId: string
  ) => {
    try {
      // Mock comparison submission
      console.log('Submitting comparison:', { preferredCourseId, otherCourseId });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const newComparisonsRemaining = comparisonsRemaining - 1;
      setComparisonsRemaining(newComparisonsRemaining);

      if (newComparisonsRemaining > 0) {
        // Get next pair of courses and navigate
        const availableCourses = mockCourses.filter(c => 
          c.course_id !== preferredCourseId && 
          c.course_id !== otherCourseId &&
          c.average_rating > 4.0
        );
        
        if (availableCourses.length >= 2) {
          const randomCourses = availableCourses
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

          router.push({
            pathname: '/(modals)/comparison',
            params: {
              courseAId: randomCourses[0].course_id,
              courseBId: randomCourses[1].course_id,
              remainingComparisons: newComparisonsRemaining,
            },
          });
        } else {
          // Not enough courses for more comparisons
          router.push('/(tabs)');
        }
      } else {
        // End of comparison flow
        router.push('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comparison');
    }
  }, [comparisonsRemaining, router]);

  const skipComparison = useCallback(() => {
    const newComparisonsRemaining = comparisonsRemaining - 1;
    setComparisonsRemaining(newComparisonsRemaining);
    
    if (newComparisonsRemaining > 0) {
      // Get next pair of courses for comparison
      const availableCourses = mockCourses.filter(c => c.average_rating > 4.0);
      if (availableCourses.length >= 2) {
        const randomCourses = availableCourses
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);

        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: randomCourses[0].course_id,
            courseBId: randomCourses[1].course_id,
            remainingComparisons: newComparisonsRemaining,
          },
        });
      } else {
        router.push('/(tabs)');
      }
    } else {
      router.push('/(tabs)');
    }
  }, [comparisonsRemaining, router]);

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