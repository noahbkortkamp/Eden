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
import { userService } from '../../services/userService';

interface ReviewContextType {
  submitReview: (review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'> & { 
    fromOnboarding?: boolean 
  }) => Promise<void>;
  startComparisons: (rating: SentimentRating) => Promise<void>;
  handleComparison: (preferredCourseId: string, otherCourseId: string) => Promise<void>;
  skipComparison: (courseAId: string, courseBId: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Calculate the number of comparisons based on course count in a sentiment category
 * - 3 or fewer courses: 3 comparisons
 * - More than 5 courses: 4 comparisons
 * - More than 10 courses: 5 comparisons
 */
const getMaxComparisons = (courseCount: number): number => {
  let maxComparisons = 3; // Default
  
  if (courseCount > 10) {
    maxComparisons = 5;
  } else if (courseCount > 5) {
    maxComparisons = 4;
  }
  
  console.log(`Calculated max comparisons: ${maxComparisons} based on courseCount: ${courseCount}`);
  return maxComparisons;
};

/**
 * Get the top-ranked course in a sentiment tier
 */
const getTopRankedCourseInTier = async (userId: string, sentiment: SentimentRating) => {
  const rankings = await rankingService.getUserRankings(userId, sentiment);
  if (!rankings || rankings.length === 0) return null;
  
  // Sort by position (lowest position is highest rank)
  const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
  return sortedRankings[0]; // Return the top-ranked course
};

/**
 * Get the bottom-ranked course in a sentiment tier
 */
const getBottomRankedCourseInTier = async (userId: string, sentiment: SentimentRating) => {
  const rankings = await rankingService.getUserRankings(userId, sentiment);
  if (!rankings || rankings.length === 0) return null;
  
  // Sort by position (highest position is lowest rank)
  const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
  return sortedRankings[sortedRankings.length - 1]; // Return the bottom-ranked course
};

/**
 * Get the median-ranked course in a sentiment tier
 */
const getMedianRankedCourseInTier = async (userId: string, sentiment: SentimentRating) => {
  const rankings = await rankingService.getUserRankings(userId, sentiment);
  if (!rankings || rankings.length === 0) return null;
  
  // Sort by position (lowest position is highest rank)
  const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
  
  // Find the middle index
  const middleIndex = Math.floor(sortedRankings.length / 2);
  
  // Return the median-ranked course
  console.log(`[getMedianRankedCourseInTier] Found median course at position ${sortedRankings[middleIndex].rank_position} out of ${sortedRankings.length} courses`);
  return sortedRankings[middleIndex];
};

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { setNeedsRefresh } = usePlayedCourses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonsRemaining, setComparisonsRemaining] = useState(3); // Default to 3
  const [totalComparisonsCount, setTotalComparisonsCount] = useState(3); // Track the total
  const [originalReviewedCourseId, setOriginalReviewedCourseId] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<Array<{ preferredId: string, otherId: string }>>([]);

  // 🚀 Phase 1.2: Simple cache for profile verification to reduce database hits
  const [profileCache] = useState(new Map<string, { verified: boolean; timestamp: number }>());
  const PROFILE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  const submitReview = useCallback(async (
    review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'> & { 
      fromOnboarding?: boolean 
    }
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

    const isFromOnboarding = review.fromOnboarding === true;
    console.log('ReviewContext: Starting review submission:', {
      userId: user.id,
      courseId: review.course_id,
      rating: review.rating,
      hasNotes: !!review.notes,
      favoriteHoles: review.favorite_holes,
      photosCount: review.photos.length,
      datePlayed: review.date_played,
      tags: review.tags,
      fromOnboarding: isFromOnboarding
    });

    setIsSubmitting(true);
    setError(null);

    try {
      // PHASE 1.1 OPTIMIZATION: Parallel execution of independent operations
      console.log('🚀 [Optimization] Starting parallel database operations...');
      const startTime = Date.now();

      // Group 1: Core review creation and profile verification (can run in parallel)
      const [createdReview, profileExists] = await Promise.all([
        createReview(
          user.id,
          review.course_id,
          review.rating,
          review.notes,
          review.favorite_holes,
          review.photos,
          review.date_played.toISOString(),
          review.tags || []
        ),
        cachedVerifyUserProfile(user.id)
      ]);

      console.log('ReviewContext: Review created successfully:', {
        reviewId: createdReview.id,
        courseId: createdReview.course_id,
        rating: createdReview.rating
      });

      if (!profileExists) {
        console.log('Profile verification completed after review submission');
      }

      // Group 2: Post-review operations that can run in parallel
      const parallelOperationsPromises = [
        // Remove from bookmarks (non-critical, can fail)
        supabase
          .from('want_to_play_courses')
          .delete()
          .match({ 
            user_id: user.id, 
            course_id: review.course_id 
          })
          .then(({ error }) => {
            if (error) {
              console.warn('Failed to remove course from bookmarks:', error);
            } else {
              console.log('Successfully removed reviewed course from bookmarks');
            }
            return { success: !error, operation: 'bookmark_removal' };
          })
          .catch(err => {
            console.warn('Error removing bookmarked course, continuing anyway:', err);
            return { success: false, operation: 'bookmark_removal' };
          }),

        // Get review count
        reviewService.getUserReviewCount(user.id)
          .then(count => {
            console.log(`User review count after submission: ${count}`);
            if (count === 10) {
              console.log('🎉 User has reached 10 reviews! Score visibility is now ENABLED');
            }
            return count;
          })
          .catch(err => {
            console.error('Error getting review count:', err);
            return 1; // Fallback to assume this isn't first review
          }),

        // Mark played courses as needing refresh (immediate, non-async)
        Promise.resolve().then(() => {
          setNeedsRefresh();
          console.log('ReviewContext: Marked played courses for refresh');
          return { success: true, operation: 'refresh_marker' };
        }),

        // Get user's reviewed courses for comparison logic
        getReviewsForUser(user.id)
          .catch(err => {
            console.error('Error fetching user reviews:', err);
            return []; // Fallback to empty array
          })
      ];

      // Wait for all parallel operations with individual error handling
      const parallelResults = await Promise.allSettled(parallelOperationsPromises);
      
      // Extract results with error handling
      const bookmarkResult = parallelResults[0].status === 'fulfilled' ? parallelResults[0].value : { success: false };
      const reviewCount = parallelResults[1].status === 'fulfilled' ? parallelResults[1].value : 1;
      const refreshResult = parallelResults[2].status === 'fulfilled' ? parallelResults[2].value : { success: true };
      const userReviews = parallelResults[3].status === 'fulfilled' ? parallelResults[3].value : [];

      const optimizationTime = Date.now() - startTime;
      console.log(`🚀 [Optimization] Parallel operations completed in ${optimizationTime}ms`);
      
      console.log(`🔍 CRITICAL DEBUG: Review count = ${reviewCount}, isFromOnboarding = ${isFromOnboarding}`);
      
      // Check if this is the user's first review - if so, skip comparisons and show first review success screen
      if (reviewCount === 1 || isFromOnboarding) {
        console.log('🎉 This is the user\'s first review or from onboarding! Showing first review success screen.');
        
        // Use a clear flag to manage navigation state
        let isNavigating = false;
        
        try {
          // Group 3: First review success preparation (can run in parallel)
          const [courseDetails] = await Promise.allSettled([
            getCourse(review.course_id).catch(err => {
              console.warn('Error pre-fetching course details, will use defaults:', err);
              return null;
            })
          ]);

          let courseName = 'Course';
          let courseLocation = '';
          
          if (courseDetails.status === 'fulfilled' && courseDetails.value) {
            courseName = courseDetails.value.name || 'Course';
            courseLocation = courseDetails.value.location || '';
            console.log('Got course details for success screen:', {
              name: courseName,
              location: courseLocation
            });
          } else {
            console.warn('getCourse returned null or failed for course ID:', review.course_id);
          }
          
          // Group 4: User metadata updates (can run in parallel)
          const metadataPromises = [
            supabase.auth.updateUser({
              data: { 
                has_completed_first_review: true,
                firstReviewCompleted: true,
                firstReviewTimestamp: new Date().toISOString(),
                onboardingComplete: true
              }
            }).then(({ data: userUpdate, error: updateError }) => {
              if (updateError) {
                console.error('Error updating user metadata:', updateError);
                return { success: false, operation: 'metadata_update' };
              } else {
                console.log('Successfully updated user metadata:', userUpdate?.user?.user_metadata);
                return { success: true, operation: 'metadata_update' };
              }
            }),

            userService.markFirstReviewComplete(user.id)
              .then(markResult => {
                console.log(`Marked user as having completed first review: ${markResult ? 'success' : 'failed'}`);
                return { success: markResult, operation: 'legacy_mark' };
              })
              .catch(legacyErr => {
                console.error('Error in legacy markFirstReviewComplete call:', legacyErr);
                return { success: false, operation: 'legacy_mark' };
              })
          ];

          // Wait for metadata updates (don't block navigation on these)
          Promise.allSettled(metadataPromises).then(results => {
            console.log('User metadata updates completed:', results);
          });
          
          // Prepare navigation parameters
          const safeNavigationParams = {
            courseName: encodeURIComponent(courseName),
            courseLocation: courseLocation ? encodeURIComponent(courseLocation) : undefined,
            datePlayed: encodeURIComponent(review.date_played.toISOString()),
            timestamp: Date.now().toString()
          };
          
          // Simplified navigation logic (removed nested timeouts)
          console.log('🚀 Starting optimized first review success navigation');
          isNavigating = true;
          
          try {
            // Single navigation attempt with one fallback
            router.replace('/(tabs)');
            
            setTimeout(() => {
              router.push({
                pathname: '/(modals)/onboarding-first-review-success',
                params: safeNavigationParams
              });
              console.log('🚀 Success screen navigation executed');
            }, 100);
            
          } catch (navError) {
            console.error('Navigation error:', navError);
            router.replace('/(tabs)/lists');
          }
          
          return;
        } catch (err) {
          console.error('Error in first review success flow:', err);
          
          if (!isNavigating) {
            router.replace('/(tabs)/lists');
          }
        }
        
        return;
      }
      
      // Continue with comparison flow for non-first reviews
      const reviewedCoursesWithSentiment = userReviews.filter(r => r.rating === review.rating);

      console.log('ReviewContext: Found matching sentiment reviews:', {
        totalMatching: reviewedCoursesWithSentiment.length,
        sentiment: review.rating
      });

      // Group 5: Comparison preparation (parallel ranking and course data fetch)
      const [rankingsResult] = await Promise.allSettled([
        rankingService.getUserRankings(user.id, review.rating)
      ]);

      const rankings = rankingsResult.status === 'fulfilled' ? rankingsResult.value : [];
      const existingRanking = rankings.find(r => r.course_id === review.course_id);

      console.log('ReviewContext: Checking existing ranking:', {
        hasExistingRanking: !!existingRanking,
        totalRankings: rankings.length
      });

      // Filter out the current course from potential comparison courses
      const otherCoursesWithSentiment = reviewedCoursesWithSentiment.filter(
        r => r.course_id !== review.course_id
      );

      if (otherCoursesWithSentiment.length > 0) {
        // Store the original reviewed course ID and reset comparison results
        setOriginalReviewedCourseId(review.course_id);
        setComparisonResults([]);
        
        // Calculate max comparisons dynamically based on the number of courses with the same sentiment
        const sentimentCourseCount = reviewedCoursesWithSentiment.length;
        const maxComparisons = getMaxComparisons(sentimentCourseCount);
        console.log(`Dynamic comparison limit: ${maxComparisons} (based on ${sentimentCourseCount} courses with ${review.rating} sentiment)`);
        
        // Set comparisons remaining to either maxComparisons or the number of available courses
        const totalComparisons = Math.min(otherCoursesWithSentiment.length, maxComparisons);
        setComparisonsRemaining(totalComparisons);
        setTotalComparisonsCount(totalComparisons);

        console.log(`Setting up comparison flow with ${totalComparisons} total comparisons out of ${otherCoursesWithSentiment.length} available courses`);
        console.log(`Will compare the just-reviewed course (${review.course_id}) with other courses in the same sentiment tier`);

        // Find the median-ranked course for the first comparison
        const medianCourse = await getMedianRankedCourseInTier(user.id, review.rating);
        console.log(`Using median-ranked course for initial comparison: ${medianCourse?.course_id}`);
        
        // If median course is null or same as the reviewed course, fall back to a random course
        let comparisonCourseId: string;
        if (!medianCourse || medianCourse.course_id === review.course_id) {
          // Fall back to random selection
          const shuffledCourses = [...otherCoursesWithSentiment].sort(() => Math.random() - 0.5);
          comparisonCourseId = shuffledCourses[0].course_id;
          console.log(`No suitable median course found, using random course: ${comparisonCourseId}`);
        } else {
          comparisonCourseId = medianCourse.course_id;
        }
        
        // Preload the courses data in the background (non-blocking)
        Promise.all([
          getCourse(review.course_id),
          getCourse(comparisonCourseId)
        ]).catch(err => {
          console.warn('Failed to preload courses, will load on demand:', err);
        });

        // Now close the review modal before opening the comparison modal
        router.back();
        
        // Short delay to ensure the navigation is smooth
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then open the comparison modal with the just-reviewed course and the median course
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: review.course_id,
            courseBId: comparisonCourseId,
            remainingComparisons: totalComparisons,
            totalComparisons: totalComparisons,
            originalSentiment: review.rating,
            originalReviewedCourseId: review.course_id
          },
        });
      } else {
        // No other courses with same sentiment, end the flow by showing success screen
        console.log(`No other courses with '${review.rating}' sentiment for comparison, going to success screen`);
        router.back(); // Close review modal
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push({
          pathname: '/(modals)/review-success',
          params: {
            courseId: review.course_id,
            datePlayed: review.date_played.toISOString()
          }
        });
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
        // Get the latest rankings in this sentiment category
        const rankings = await rankingService.getUserRankings(user.id, rating);
        console.log(`Found ${rankings.length} ranked courses in the '${rating}' category`);
        
        let courseA, courseB;
        
        // Always try to find the median-ranked course for the initial comparison
        const medianCourse = await getMedianRankedCourseInTier(user.id, rating);
        console.log(`Using median-ranked course for initial comparison: ${medianCourse?.course_id}`);
        
        if (medianCourse && rankings.length >= 2) {
          // We have a valid median course and enough rankings
          // Get all courses that aren't the median for comparison
          const otherCourses = reviewedCoursesWithSentiment.filter(
            course => course.course_id !== medianCourse.course_id
          );
          
          if (otherCourses.length === 0) {
            console.log('No other courses found for comparison after filtering out median course');
            // Fall back to random selection from all courses
            const shuffledCourses = [...reviewedCoursesWithSentiment].sort(() => Math.random() - 0.5);
            courseA = shuffledCourses[0];
            courseB = shuffledCourses[1];
          } else {
            // Shuffle the other courses for randomness
            const shuffledOtherCourses = [...otherCourses].sort(() => Math.random() - 0.5);
            
            // Use the median course as course A and a random other course as course B
            courseA = { course_id: medianCourse.course_id };
            courseB = shuffledOtherCourses[0];
          }
          
          console.log(`Initial comparison set up: Median course ${courseA.course_id} vs Random course ${courseB.course_id}`);
        } else {
          // If no median or not enough rankings, fall back to random selection
          console.log(`No median course found in '${rating}' category. Falling back to random selection.`);
          
          // Implement proper randomization with shuffle
          const shuffledCourses = [...reviewedCoursesWithSentiment].sort(() => Math.random() - 0.5);
          
          // Take the first two courses from the properly shuffled array
          courseA = shuffledCourses[0];
          courseB = shuffledCourses[1];
          
          console.log(`Random selection: ${courseA.course_id} vs ${courseB.course_id}`);
        }
        
        // VALIDATION: Ensure we don't compare a course against itself
        if (courseA.course_id === courseB.course_id) {
          console.error(`[ERROR] Attempted to set up comparison of course ${courseA.course_id} against itself`);
          // Try to find another course for comparison
          const otherCourses = reviewedCoursesWithSentiment.filter(
            course => course.course_id !== courseA.course_id
          );
          
          if (otherCourses.length > 0) {
            // Pick a different course for B
            const shuffledOtherCourses = [...otherCourses].sort(() => Math.random() - 0.5);
            courseB = shuffledOtherCourses[0];
            console.log(`Fixed self-comparison issue. New selection: ${courseA.course_id} vs ${courseB.course_id}`);
          } else {
            console.error('No other courses available for comparison. Aborting comparison flow.');
            // Not enough distinct courses, show success screen for the first course
            router.push({
              pathname: '/(modals)/review-success',
              params: {
                courseId: courseA.course_id,
                datePlayed: reviewedCoursesWithSentiment[0].date_played
              }
            });
            return;
          }
        }
        
        // Calculate max comparisons dynamically based on the count
        const maxComparisons = getMaxComparisons(reviewedCoursesWithSentiment.length);
        console.log(`Dynamic comparison limit: ${maxComparisons} (based on ${reviewedCoursesWithSentiment.length} courses with ${rating} sentiment)`);
        
        // Update the state with the calculated max comparisons
        setComparisonsRemaining(maxComparisons);
        setTotalComparisonsCount(maxComparisons);

        // Store course A as the "original" for this session
        setOriginalReviewedCourseId(courseA.course_id);

        // Then open the comparison modal
        router.push({
          pathname: '/(modals)/comparison',
          params: {
            courseAId: courseA.course_id,
            courseBId: courseB.course_id,
            remainingComparisons: maxComparisons,
            totalComparisons: maxComparisons,
            originalSentiment: rating,
            originalReviewedCourseId: courseA.course_id
          },
        });

        console.log(`Starting comparison flow with ${courseA.course_id} as the constant course being compared`);
        console.log(`First comparison will be between ${courseA.course_id} and ${courseB.course_id}`);
        console.log(`Will perform a total of ${maxComparisons} comparisons`);
      } else {
        // Not enough reviewed courses, show success screen for the first course
        console.log(`Not enough courses with '${rating}' sentiment for comparison flow`);
        // Find at least one course in this sentiment category
        const coursesWithSentiment = userReviews.filter(r => r.rating === rating);
        
        if (coursesWithSentiment.length > 0) {
          const course = coursesWithSentiment[0];
          router.push({
            pathname: '/(modals)/review-success',
            params: {
              courseId: course.course_id,
              datePlayed: course.date_played
            }
          });
        } else {
          // If no courses found with this sentiment, go back to lists
          router.replace('/(tabs)/lists');
        }
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
      console.log(`Processing comparison result: ${preferredCourseId} was preferred over ${otherCourseId}`);
      
      // VALIDATION: Prevent comparing a course against itself
      if (preferredCourseId === otherCourseId) {
        console.error(`[ERROR] Attempted to process comparison of course ${preferredCourseId} against itself`);
        // Skip this comparison and move on to the next one or end flow
        const newComparisonsRemaining = comparisonsRemaining - 1;
        setComparisonsRemaining(newComparisonsRemaining);
        
        if (newComparisonsRemaining <= 0) {
          // End comparison flow if no more comparisons needed
          const userReviews = await getReviewsForUser(user.id);
          const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
          
          if (originalReview) {
            router.push({
              pathname: '/(modals)/review-success',
              params: {
                courseId: originalReviewedCourseId,
                datePlayed: originalReview.date_played
              }
            });
          } else {
            router.replace('/(tabs)/lists');
          }
          return;
        }
        
        // Otherwise, try to set up the next comparison
        const userReviews = await getReviewsForUser(user.id);
        const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
        
        if (originalReview) {
          const sentiment = originalReview.rating as SentimentRating;
          
          // Get all previously compared courses
          const comparedCourseIds = new Set();
          comparedCourseIds.add(originalReviewedCourseId);
          comparedCourseIds.add(preferredCourseId); // This is same as otherCourseId in this case
          
          comparisonResults.forEach(result => {
            comparedCourseIds.add(result.preferredId);
            comparedCourseIds.add(result.otherId);
          });
          
          const otherCoursesWithSentiment = userReviews.filter(r => 
            !comparedCourseIds.has(r.course_id) &&
            r.rating === originalReview.rating
          );
          
          if (otherCoursesWithSentiment.length > 0) {
            const shuffledCourses = [...otherCoursesWithSentiment].sort(() => Math.random() - 0.5);
            const randomCourse = shuffledCourses[0];
            
            router.push({
              pathname: '/(modals)/comparison',
              params: {
                courseAId: originalReviewedCourseId,
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
                totalComparisons: totalComparisonsCount,
                originalSentiment: sentiment,
                originalReviewedCourseId: originalReviewedCourseId
              },
            });
            return;
          }
        }
        
        // If we can't set up another comparison, end the flow
        router.replace('/(tabs)/lists');
        return;
      }
      
      // Store the comparison result
      setComparisonResults(prev => [
        ...prev,
        { preferredId: preferredCourseId, otherId: otherCourseId }
      ]);

      // Get the original review to know the sentiment category
      const userReviews = await getReviewsForUser(user.id);
      const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
      
      if (originalReview) {
        const sentiment = originalReview.rating as SentimentRating;
        
        // Get current rankings and ensure both courses have rankings
        const rankings = await rankingService.getUserRankings(user.id, sentiment);
        const preferredCourseRanking = rankings.find(r => r.course_id === preferredCourseId);
        const otherCourseRanking = rankings.find(r => r.course_id === otherCourseId);

        // If either course doesn't have a ranking, add them
        if (!preferredCourseRanking) {
          await rankingService.addCourseRanking(
            user.id,
            preferredCourseId,
            sentiment
          );
        }
        if (!otherCourseRanking) {
          await rankingService.addCourseRanking(
            user.id,
            otherCourseId,
            sentiment
          );
        }

        // Now that we're sure both courses have rankings, update them
        await rankingService.updateRankingsAfterComparison(
          user.id,
          preferredCourseId,
          otherCourseId,
          sentiment
        );

        // Check if this is the first comparison (comparing with the median)
        const isFirstComparison = comparisonResults.length === 0;
        
        if (isFirstComparison) {
          console.log('This was the first comparison (against the median course)');
          
          // Sort rankings by position to find top and bottom courses
          const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
          const topCourse = sortedRankings.length > 0 ? sortedRankings[0] : null;
          const bottomCourse = sortedRankings.length > 0 ? sortedRankings[sortedRankings.length - 1] : null;
          
          // Is the new course the one that was preferred?
          const isNewCoursePreferred = preferredCourseId === originalReviewedCourseId;
          
          if (isNewCoursePreferred) {
            console.log('New course was preferred over the median course');
            // New course > Median: Next comparison should be against the top course
            if (topCourse && topCourse.course_id !== otherCourseId) {
              console.log(`Next comparison will be against top course: ${topCourse.course_id}`);
              
              router.push({
                pathname: '/(modals)/comparison',
                params: {
                  courseAId: originalReviewedCourseId,
                  courseBId: topCourse.course_id,
                  remainingComparisons: comparisonsRemaining, // Don't decrement yet
                  totalComparisons: totalComparisonsCount,
                  originalSentiment: sentiment,
                  originalReviewedCourseId: originalReviewedCourseId
                },
              });
              return;
            }
          } else {
            console.log('Median course was preferred over the new course');
            // Median > New course: Next comparison should be against the bottom course
            if (bottomCourse && bottomCourse.course_id !== preferredCourseId) {
              console.log(`Next comparison will be against bottom course: ${bottomCourse.course_id}`);
              
              router.push({
                pathname: '/(modals)/comparison',
                params: {
                  courseAId: originalReviewedCourseId,
                  courseBId: bottomCourse.course_id,
                  remainingComparisons: comparisonsRemaining, // Don't decrement yet
                  totalComparisons: totalComparisonsCount,
                  originalSentiment: sentiment,
                  originalReviewedCourseId: originalReviewedCourseId
                },
              });
              return;
            }
          }
        }

        // Decrement the comparisons counter for subsequent comparisons
        const newComparisonsRemaining = comparisonsRemaining - 1;
        setComparisonsRemaining(newComparisonsRemaining);

        console.log(`Comparisons flow: ${comparisonsRemaining} -> ${newComparisonsRemaining} remaining`);
        console.log(`Original course being compared consistently: ${originalReviewedCourseId}`);

        if (newComparisonsRemaining > 0) {
          // After first comparison, continue with rest of function as it was...
          // Get all previously compared courses
          const comparedCourseIds = new Set();
          // Always include the original course as it's part of every comparison
          comparedCourseIds.add(originalReviewedCourseId);
          // Add the current comparison courses
          comparedCourseIds.add(preferredCourseId);
          comparedCourseIds.add(otherCourseId);
          // Add all previously compared courses
          comparisonResults.forEach(result => {
            comparedCourseIds.add(result.preferredId);
            comparedCourseIds.add(result.otherId);
          });

          console.log(`Excluded courses from future comparisons: ${Array.from(comparedCourseIds).join(', ')}`);

          // Get other courses with the same sentiment for comparison, excluding already compared courses
          const otherCoursesWithSentiment = userReviews.filter(r => 
            !comparedCourseIds.has(r.course_id) &&
            r.rating === originalReview.rating
          );

          if (otherCoursesWithSentiment.length > 0) {
            // Get a random course for the next comparison, with proper shuffling
            const shuffledCourses = [...otherCoursesWithSentiment].sort(() => Math.random() - 0.5);
            const randomCourse = shuffledCourses[0];

            console.log(`Found ${otherCoursesWithSentiment.length} other courses with matching sentiment to compare`);
            console.log(`Next comparison will be between ${originalReviewedCourseId} and ${randomCourse.course_id}`);

            // Use the sentiment from the original review we already have
            const sentiment = originalReview.rating as SentimentRating;

            // Update params to include the originalReviewedCourseId for the comparison
            router.push({
              pathname: '/(modals)/comparison',
              params: {
                courseAId: originalReviewedCourseId,
                courseBId: randomCourse.course_id,
                remainingComparisons: newComparisonsRemaining,
                totalComparisons: totalComparisonsCount,
                originalSentiment: sentiment,
                originalReviewedCourseId: originalReviewedCourseId
              },
            });
            console.log(`Navigating to next comparison: originalCourse vs new comparison course`);
            return;
          }
        }

        // If we've completed all comparisons or no more courses to compare, go to success screen
        console.log(`Comparisons complete, navigating to success screen for course: ${originalReviewedCourseId}`);
        router.push({
          pathname: '/(modals)/review-success',
          params: {
            courseId: originalReviewedCourseId,
            datePlayed: originalReview.date_played
          }
        });
        
        // Reset comparison state
        setOriginalReviewedCourseId(null);
        setComparisonResults([]);
        return;
      }
      
      // Fallback: if original review not found, just go to lists
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

    try {
      // Store the skip result for persistence (prevents re-showing this comparison)
      setComparisonResults(prev => [
        ...prev,
        { preferredId: courseAId, otherId: courseBId }
      ]);
      
      const newComparisonsRemaining = comparisonsRemaining - 1;
      setComparisonsRemaining(newComparisonsRemaining);
      
      if (newComparisonsRemaining > 0) {
        // Get next pair of reviewed courses with matching sentiment
        getReviewsForUser(user.id).then(async userReviews => {
          try {
            const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
            
            if (originalReview) {
              // Get all previously compared courses
              const comparedCourseIds = new Set();
              // Always include the original course as it's part of every comparison
              comparedCourseIds.add(originalReviewedCourseId);
              // Add the current comparison courses
              comparedCourseIds.add(courseAId);
              comparedCourseIds.add(courseBId);
              // Add all previously compared courses
              comparisonResults.forEach(result => {
                comparedCourseIds.add(result.preferredId);
                comparedCourseIds.add(result.otherId);
              });

              console.log(`Excluded courses from future comparisons: ${Array.from(comparedCourseIds).join(', ')}`);

              const otherCoursesWithSentiment = userReviews.filter(r => 
                !comparedCourseIds.has(r.course_id) &&
                r.rating === originalReview.rating
              );
              
              if (otherCoursesWithSentiment.length >= 1) {
                // Randomize properly
                const shuffledCourses = [...otherCoursesWithSentiment].sort(() => Math.random() - 0.5);
                const randomCourse = shuffledCourses[0];

                console.log(`Skipping to next comparison: original course ${originalReviewedCourseId} vs next course ${randomCourse.course_id}`);

                router.push({
                  pathname: '/(modals)/comparison',
                  params: {
                    courseAId: originalReviewedCourseId,
                    courseBId: randomCourse.course_id,
                    remainingComparisons: newComparisonsRemaining,
                    totalComparisons: totalComparisonsCount,
                    originalSentiment: originalReview.rating,
                    originalReviewedCourseId: originalReviewedCourseId
                  },
                });
                return;
              }
            }
            
            // If no more courses to compare, go to success screen
            console.log(`No more courses to compare or comparisons complete, navigating to success screen for course: ${originalReviewedCourseId}`);
            router.push({
              pathname: '/(modals)/review-success',
              params: {
                courseId: originalReviewedCourseId,
                datePlayed: originalReview.date_played
              }
            });
            
            // Reset comparison state
            setOriginalReviewedCourseId(null);
            setComparisonResults([]);
            return;
          } catch (innerErr) {
            console.error('Error in skipComparison inner block:', innerErr);
            setError(innerErr instanceof Error ? innerErr.message : 'Error in comparison flow');
            setOriginalReviewedCourseId(null);
            setComparisonResults([]);
            router.replace('/(tabs)/lists');
          }
          
          // Fallback: if original review not found, just go to lists
          setOriginalReviewedCourseId(null);
          setComparisonResults([]);
          router.replace('/(tabs)/lists');
        }).catch(err => {
          console.error('Error getting user reviews:', err);
          setError(err instanceof Error ? err.message : 'Failed to get user reviews');
          setOriginalReviewedCourseId(null);
          setComparisonResults([]);
          router.replace('/(tabs)/lists');
        });
      } else {
        // End of comparison flow, go to success screen instead of feed
        getReviewsForUser(user.id).then(async userReviews => {
          try {
            const originalReview = userReviews.find(r => r.course_id === originalReviewedCourseId);
            
            if (originalReview) {
              console.log(`Comparisons complete, navigating to success screen for course: ${originalReviewedCourseId}`);
              router.push({
                pathname: '/(modals)/review-success',
                params: {
                  courseId: originalReviewedCourseId,
                  datePlayed: originalReview.date_played
                }
              });
            } else {
              // Fallback if original review not found
              router.replace('/(tabs)/lists');
            }
            
            // Reset state
            setOriginalReviewedCourseId(null);
            setComparisonResults([]);
          } catch (innerErr) {
            console.error('Error in success screen navigation:', innerErr);
            setOriginalReviewedCourseId(null);
            setComparisonResults([]);
            router.replace('/(tabs)/lists');
          }
        }).catch(err => {
          console.error('Error getting user reviews for success screen:', err);
          setOriginalReviewedCourseId(null);
          setComparisonResults([]);
          router.replace('/(tabs)/lists');
        });
      }
    } catch (err) {
      console.error('Error in skipComparison:', err);
      setError(err instanceof Error ? err.message : 'Failed to skip comparison');
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

  // 🚀 Phase 1.2: Cached version of profile verification
  const cachedVerifyUserProfile = useCallback(async (userId: string): Promise<boolean> => {
    const cached = profileCache.get(userId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < PROFILE_CACHE_TTL) {
      console.log('🚀 [Cache] Using cached profile verification');
      return cached.verified;
    }
    
    const verified = await verifyUserProfile(userId);
    profileCache.set(userId, { verified, timestamp: now });
    console.log('🚀 [Cache] Cached profile verification result');
    return verified;
  }, [verifyUserProfile, profileCache, PROFILE_CACHE_TTL]);

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