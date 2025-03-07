import React, { createContext, useContext, useState, useCallback } from 'react';
import { CourseReview, Course, SentimentRating } from '../../types/review';
import { mockCourses } from '../../api/mockData';
import { useRouter } from 'expo-router';

interface ReviewContextType {
  submitReview: (review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  startComparisons: (rating: SentimentRating) => Promise<void>;
  handleComparison: (preferredCourseId: string, otherCourseId: string) => Promise<void>;
  skipComparison: (courseAId: string, courseBId: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

const MAX_COMPARISONS = 3;

// Mock user's reviewed courses (replace with actual API call in production)
const MOCK_USER_REVIEWS = [
  { course_id: 'course1', rating: 'liked' },
  { course_id: 'course2', rating: 'liked' },
  { course_id: 'course3', rating: 'disliked' },
  { course_id: 'course4', rating: 'disliked' },
];

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonsRemaining, setComparisonsRemaining] = useState(MAX_COMPARISONS);

  // Helper function to get reviewed courses with matching sentiment
  const getReviewedCoursesWithSentiment = (
    currentCourseId: string,
    sentiment: SentimentRating,
    excludeCourseIds: string[] = []
  ) => {
    return mockCourses.filter(c => 
      c.course_id !== currentCourseId && 
      !excludeCourseIds.includes(c.course_id) &&
      MOCK_USER_REVIEWS.some(r => r.course_id === c.course_id && r.rating === sentiment)
    );
  };

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

      // Get reviewed courses with matching sentiment for comparison
      const reviewedCourses = getReviewedCoursesWithSentiment(
        review.course_id,
        review.rating
      );
      
      if (reviewedCourses.length >= 2) {
        // Close the review modal first
        router.back();
        
        const randomCourses = reviewedCourses
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
        // Not enough reviewed courses for comparison, end the flow and go to feed
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [router]);

  const startComparisons = useCallback(async (rating: SentimentRating) => {
    try {
      // Get reviewed courses with matching sentiment for comparison
      const reviewedCourses = getReviewedCoursesWithSentiment('', rating);
      
      if (reviewedCourses.length >= 2) {
        const randomCourses = reviewedCourses
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
        // Get next pair of reviewed courses with matching sentiment
        // We need to find the sentiment of the current comparison
        const currentCourse = mockCourses.find(c => c.course_id === preferredCourseId);
        const currentReview = currentCourse && MOCK_USER_REVIEWS.find(r => r.course_id === currentCourse.course_id);
        
        if (currentReview) {
          const availableCourses = getReviewedCoursesWithSentiment(
            preferredCourseId,
            currentReview.rating as SentimentRating,
            [preferredCourseId, otherCourseId]
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
            return;
          }
        }
        
        // If we can't find matching sentiment courses or something went wrong,
        // end the flow and go to feed
        router.replace('/(tabs)');
      } else {
        // End of comparison flow, go to feed
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comparison');
    }
  }, [comparisonsRemaining, router]);

  const skipComparison = useCallback((courseAId: string, courseBId: string) => {
    const newComparisonsRemaining = comparisonsRemaining - 1;
    setComparisonsRemaining(newComparisonsRemaining);
    
    if (newComparisonsRemaining > 0) {
      // Get next pair of reviewed courses with matching sentiment
      const currentCourse = mockCourses.find(c => c.course_id === courseAId);
      const currentReview = currentCourse && MOCK_USER_REVIEWS.find(r => r.course_id === currentCourse.course_id);
      
      if (currentReview) {
        const reviewedCourses = getReviewedCoursesWithSentiment(
          courseAId,
          currentReview.rating as SentimentRating,
          [courseAId, courseBId]
        );
        
        if (reviewedCourses.length >= 2) {
          const randomCourses = reviewedCourses
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
          return;
        }
      }
      
      // If we can't find matching sentiment courses or something went wrong,
      // end the flow and go to feed
      router.replace('/(tabs)');
    } else {
      // End of comparison flow, go to feed
      router.replace('/(tabs)');
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