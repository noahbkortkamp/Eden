import React, { createContext, useContext, useState, useCallback } from 'react';
import { CourseReview, Course, SentimentRating } from '../../types/review';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePlayedCourses } from '../../context/PlayedCoursesContext';
import { createReview, getReviewsForUser, getAllTags } from '../../utils/reviews';
import { format } from 'date-fns';
import { reviewService } from '../../services/reviewService';
import { rankingService } from '../../services/rankingService';
import { supabase } from '../../utils/supabase';
import { getCourse } from '../../utils/courses';

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
  const { setNeedsRefresh } = usePlayedCourses();
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

    console.log('CRITICAL DEBUG - Auth user details:', {
      userId: user.id,
      userEmail: user.email,
      userMetadata: user.user_metadata
    });

    console.log('ReviewContext: Starting review submission:', {
      userId: user.id,
      courseId: review.course_id,
      rating: review.rating,
      hasNotes: !!review.notes,
      favoriteHoles: review.favorite_holes,
      photosCount: review.photos.length,
      datePlayed: review.date_played,
      tags: review.tags
    });

    setIsSubmitting(true);
    setError(null);

    try {
      // Start profile verification in parallel with other operations
      const profileVerificationPromise = verifyUserProfile(user.id);
      
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

      console.log('ReviewContext: Review created successfully:', {
        reviewId: createdReview.id,
        courseId: createdReview.course_id,
        rating: createdReview.rating
      });

      // Await profile verification result (should be done by now)
      const profileExists = await profileVerificationPromise;
      if (!profileExists) {
        console.log('Profile verification completed after review submission');
      }

      // Start these non-blocking operations in parallel
      const promises = [
        // Check review count
        reviewService.getUserReviewCount(user.id).then(count => {
          if (count === 10) {
            console.log('🎉 User has reached 10 reviews! Score visibility is now ENABLED');
          }
          return count;
        }),
        
        // Mark played courses as needing refresh
        (async () => {
          setNeedsRefresh();
          console.log('ReviewContext: Marked played courses for refresh');
        })(),
        
        // Get user's reviewed courses with matching sentiment for comparison
        getReviewsForUser(user.id)
      ];

      // Wait for all parallel operations to complete
      const [reviewCount, _, userReviews] = await Promise.all(promises);
      
      const reviewedCoursesWithSentiment = userReviews.filter(r => r.rating === review.rating);

      console.log('ReviewContext: Found matching sentiment reviews:', {
        totalMatching: reviewedCoursesWithSentiment.length,
        sentiment: review.rating
      });

      // Check if course already has a ranking
      const rankings = await rankingService.getUserRankings(user.id, review.rating);
      const existingRanking = rankings.find(r => r.course_id === review.course_id);

      console.log('ReviewContext: Checking existing ranking:', {
        hasExistingRanking: !!existingRanking,
        totalRankings: rankings.length
      });

      if (!existingRanking) {
        // Add initial ranking for the new course only if it doesn't exist
        const initialRankPosition = rankings.length + 1;
        try {
          await rankingService.addCourseRanking(
            user.id,
            review.course_id,
            review.rating,
            initialRankPosition
          );
        } catch (rankingError) {
          console.error('Error adding initial ranking, continuing anyway:', rankingError);
          // Continue with the flow anyway
        }
      }

      // Filter out the current course from potential comparison courses
      const otherCoursesWithSentiment = reviewedCoursesWithSentiment.filter(
        r => r.course_id !== review.course_id
      );

      if (otherCoursesWithSentiment.length > 0) {
        // Start preloading courses for comparison to improve loading times
        const randomCourse = otherCoursesWithSentiment[
          Math.floor(Math.random() * otherCoursesWithSentiment.length)
        ];
        
        // Preload the courses data in the background
        Promise.all([
          getCourse(review.course_id),
          getCourse(randomCourse.course_id)
        ]).catch(err => {
          console.warn('Failed to preload courses, will load on demand:', err);
        });
        
        // Store the original reviewed course ID and reset comparison results
        setOriginalReviewedCourseId(review.course_id);
        setComparisonResults([]);
        
        // Reset comparisons remaining to either MAX_COMPARISONS or the number of available courses
        const totalComparisons = Math.min(otherCoursesWithSentiment.length, MAX_COMPARISONS);
        setComparisonsRemaining(totalComparisons);

        // Now close the review modal before opening the comparison modal
        router.back();
        
        // Short delay to ensure the navigation is smooth
        await new Promise(resolve => setTimeout(resolve, 100));

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
        router.back(); // Close review modal
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace('/(tabs)/lists');
      }
    } catch (err) {
      console.error('Detailed submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [router, user, setNeedsRefresh]);

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
        router.replace('/(tabs)/lists');
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
        router.replace('/(tabs)/lists');
      }
      
      // Reset state and go back to feed
      setOriginalReviewedCourseId(null);
      setComparisonResults([]);
      router.replace('/(tabs)/lists');
    } catch (err) {
      console.error('Detailed comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit comparison');
      setTimeout(() => {
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        router.replace('/(tabs)/lists');
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
        router.replace('/(tabs)/lists');
      }).catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to get user reviews');
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        router.replace('/(tabs)/lists');
      });
    } else {
      // End of comparison flow, go to feed
      setOriginalReviewedCourseId(null);
      setComparisonResults([]);
      router.replace('/(tabs)/lists');
    }
  }, [comparisonsRemaining, router, user, originalReviewedCourseId, comparisonResults]);

  const verifyUserProfile = useCallback(async (userId: string) => {
    if (!userId) return false;
    
    console.log('Verifying user profile for ID:', userId);
    try {
      // Check if user profile exists
      const { data: profile, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          console.log('No user profile found, creating one...');
          return await createUserProfile(userId);
        }
        console.error('Error checking user profile:', error);
        return false;
      }
      
      return !!profile;
    } catch (err) {
      console.error('Error in verifyUserProfile:', err);
      return false;
    }
  }, []);

  const createUserProfile = useCallback(async (userId: string) => {
    try {
      const randomUsername = `user_${Math.random().toString(36).substring(2, 10)}`;
      
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: randomUsername,
          full_name: user?.user_metadata?.name || 'New Golfer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Failed to create user profile:', error);
        return false;
      }
      
      console.log('Successfully created user profile for:', userId);
      return true;
    } catch (err) {
      console.error('Error creating user profile:', err);
      return false;
    }
  }, [user]);

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