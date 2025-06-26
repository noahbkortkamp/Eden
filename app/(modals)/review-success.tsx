import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useCourse, CourseProvider } from '../context/CourseContext';
import { ReviewSuccessScreen } from '../review/screens/ReviewSuccessScreen';
import { reviewService } from '../services/reviewService';
import { getReviewsForUser } from '../utils/reviews';
import { rankingService } from '../services/rankingService';
import ThemedLoadingScreen from '../components/ThemedLoadingScreen';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { useSubscription } from '../hooks/useSubscription';

// Inner component that uses the CourseContext
function ReviewSuccessContent() {
  const params = useLocalSearchParams<{ 
    courseId: string; 
    datePlayed: string;
  }>();
  
  const courseId = params.courseId;
  const datePlayedParam = params.datePlayed;
  
  const router = useRouter();
  const { user } = useAuth();
  const { course, isLoading: courseLoading, error: courseError } = useCourse();
  const { setNeedsRefresh } = usePlayedCourses();
  const { subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [userReviewCount, setUserReviewCount] = useState(0);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Add a timeout to prevent being stuck in loading state forever
  useEffect(() => {
    console.log(`ReviewSuccessScreen: Initializing with courseId=${courseId}, loading=${isLoading}, courseLoading=${courseLoading}`);
    
    // Set up a global timeout to prevent getting stuck in loading state
    const globalTimeout = setTimeout(() => {
      if (isLoading || courseLoading) {
        console.warn(`ReviewSuccessScreen: Global timeout triggered after 10s, courseId=${courseId}`);
        setError('Loading timed out, please try again');
        setIsLoading(false);
      }
    }, 10000); // 10 second global timeout
    
    return () => clearTimeout(globalTimeout);
  }, []);

  // Force refresh all rankings when the success screen is shown
  // This ensures proper score distribution after comparisons
  useEffect(() => {
    if (user && !isLoading) {
      const refreshRankings = async () => {
        try {
          console.log('🔄 Forcing refresh of all rankings to fix display issues');
          await rankingService.refreshAllRankings(user.id);
          
          // Now force the Lists tab to refresh when we navigate back
          setNeedsRefresh();
          console.log('🔄 Rankings refreshed successfully, Lists tab will reload on next focus');
        } catch (err) {
          console.error('Error refreshing rankings:', err);
          // Continue anyway, this is just a proactive fix
        }
      };
      
      refreshRankings();
    }
  }, [user, isLoading, setNeedsRefresh]);

  // Fade in animation when the component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Ensure we're focusing this screen when it mounts
    const timer = setTimeout(() => {
      // This helps to ensure the modal has focus
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!courseId || !user) {
      console.log(`ReviewSuccessScreen: Missing required parameters, courseId=${courseId}, userId=${user?.id}`);
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    // If we've tried too many times, give up
    if (loadAttempts >= 3) {
      console.warn(`ReviewSuccessScreen: Failed to load after ${loadAttempts} attempts`);
      setError('Failed to load review data after multiple attempts');
      setIsLoading(false);
      return;
    }

    // Skip the data loading if the course is still loading,
    // but protect against infinite loading with an attempt counter
    if (courseLoading) {
      console.log(`ReviewSuccessScreen: Course is still loading, attempt ${loadAttempts + 1}/3`);
      
      // If course is taking too long to load, try to continue anyway after a certain number of attempts
      if (loadAttempts >= 1) {
        console.log('ReviewSuccessScreen: Course loading too long, continuing with data loading anyway');
      } else {
        // Set a timeout to retry
        const retryTimeout = setTimeout(() => {
          setLoadAttempts(prev => prev + 1);
        }, 2000);
        return () => clearTimeout(retryTimeout);
      }
    }

    const loadReviewData = async () => {
      try {
        console.log(`ReviewSuccessScreen: Loading review data for courseId=${courseId}`);
        setIsLoading(true);

        // Get user's total review count to determine if we should show rating
        const totalReviews = await reviewService.getUserReviewCount(user.id);
        console.log(`ReviewSuccessScreen: User has ${totalReviews} total reviews`);
        setUserReviewCount(totalReviews);

        // Check if user has completed exactly 2 reviews AND doesn't have active subscription
        if (totalReviews === 2 && !subscription?.hasActiveSubscription && !subscription?.isTrialPeriod) {
          console.log('🚀 User has completed 2 reviews and no active subscription! Showing Founders Membership paywall after comparisons.');
          
          // Add a small delay to ensure any IAP initialization has time to complete
          setTimeout(() => {
            router.push('/(modals)/founders-membership');
          }, 1000);
          return;
        }

        // Get how many times the user has reviewed this course
        const allUserReviews = await getReviewsForUser(user.id);
        const courseReviews = allUserReviews.filter(review => review.course_id === courseId);
        console.log(`ReviewSuccessScreen: Found ${courseReviews?.length || 0} reviews for this course`);
        
        if (courseReviews && courseReviews.length > 0) {
          // For the rating, we'll use the course ranking if the user has enough reviews
          if (totalReviews >= 10) {
            try {
              // Get the latest sentiment from course reviews
              const latestReview = courseReviews[0]; // Assuming reviews are sorted by date descending
              const sentiment = latestReview.rating;
              
              console.log(`ReviewSuccessScreen: Getting rankings for sentiment=${sentiment}`);
              const rankings = await rankingService.getUserRankings(user.id, sentiment);
              
              const courseRanking = rankings.find(r => r.course_id === courseId);
              
              if (courseRanking) {
                console.log(`ReviewSuccessScreen: Found ranking score ${courseRanking.relative_score} for this course`);
                setRating(courseRanking.relative_score);
              } else if (course?.rating) {
                // Fallback to course rating if ranking not found
                console.log(`ReviewSuccessScreen: No ranking found, using course rating ${course.rating}`);
                setRating(course.rating);
              }
            } catch (rankingError) {
              console.error('ReviewSuccessScreen: Error getting rankings:', rankingError);
              // Fallback to course rating
              if (course?.rating) {
                console.log(`ReviewSuccessScreen: Using fallback course rating ${course.rating} after error`);
                setRating(course.rating);
              }
            }
          }
        }
        
        console.log('ReviewSuccessScreen: Successfully loaded review data');
        setIsLoading(false);
      } catch (error) {
        console.error('ReviewSuccessScreen: Error loading review data:', error);
        
        // Retry automatically after a short delay
        if (loadAttempts < 2) {
          console.log(`ReviewSuccessScreen: Will retry loading data, attempt ${loadAttempts + 1}/3`);
          setLoadAttempts(prev => prev + 1);
          setTimeout(() => {
            // This will trigger the effect again due to loadAttempts change
          }, 1000);
          return;
        }
        
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setIsLoading(false);
      }
    };

    // Only load review data if we have a course or there's a course error,
    // or if we've made several attempts and want to proceed anyway
    if (course || courseError || loadAttempts >= 1) {
      loadReviewData();
    }
  }, [courseId, user, loadAttempts, course, courseLoading, courseError]);

  // Safely parse the date string to prevent invalid date errors
  const parseDatePlayed = () => {
    if (!datePlayedParam) {
      return new Date();
    }
    
    try {
      // Handle URL encoding issues with the ISO string
      const decodedDate = decodeURIComponent(datePlayedParam);
      
      // Try to parse the date string
      const parsedDate = new Date(decodedDate);
      
      // Check if the date is valid (Invalid Date check)
      if (isNaN(parsedDate.getTime())) {
        return new Date();
      }
      
      return parsedDate;
    } catch (e) {
      return new Date();
    }
  };

  const datePlayed = parseDatePlayed();

  if (courseLoading || isLoading) {
    return (
      <ThemedLoadingScreen message="Loading review details" />
    );
  }

  if (courseError || error || !course) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {courseError || error || 'Failed to load review data'}
        </Text>
        <Text 
          style={styles.backLink}
          onPress={() => router.replace('/(tabs)/lists')}
        >
          Return to home
        </Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <Stack.Screen 
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 300,
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      
      <ReviewSuccessScreen 
        datePlayed={datePlayed}
        rating={rating}
        showRating={userReviewCount >= 10}
        visitCount={userReviewCount}
      />
    </Animated.View>
  );
}

// Main export that provides the CourseContext
export default function ReviewSuccessModal() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  return (
    <CourseProvider initialCourseId={courseId}>
      <ReviewSuccessContent />
    </CourseProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F5EC',
    padding: 20,
  },
  errorText: {
    color: '#234D2C',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backLink: {
    color: '#234D2C',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
}); 