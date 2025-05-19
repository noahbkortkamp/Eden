import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Animated } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ReviewSuccessScreen } from '../review/screens/ReviewSuccessScreen';
import { getReviewsForCourse } from '../utils/reviews';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/reviewService';
import { CourseProvider, useCourse } from '../context/CourseContext';
import { rankingService } from '../services/rankingService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';

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
  const [isLoading, setIsLoading] = useState(true);
  const [userReviewCount, setUserReviewCount] = useState(0);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

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
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    // If we've tried too many times, give up
    if (loadAttempts >= 3) {
      setError('Failed to load review data after multiple attempts');
      setIsLoading(false);
      return;
    }

    // Skip the data loading if the course is still loading
    if (courseLoading) {
      return;
    }

    const loadReviewData = async () => {
      try {
        setIsLoading(true);

        // Get user's total review count to determine if we should show rating
        const totalReviews = await reviewService.getUserReviewCount(user.id);
        setUserReviewCount(totalReviews);

        // Get how many times the user has reviewed this course
        const courseReviews = await getReviewsForCourse(courseId, user.id);
        
        if (courseReviews && courseReviews.length > 0) {
          // For the rating, we'll use the course ranking if the user has enough reviews
          if (totalReviews >= 10) {
            try {
              // Get the latest sentiment from course reviews
              const latestReview = courseReviews[0]; // Assuming reviews are sorted by date descending
              const sentiment = latestReview.rating;
              
              const rankings = await rankingService.getUserRankings(user.id, sentiment);
              
              const courseRanking = rankings.find(r => r.course_id === courseId);
              
              if (courseRanking) {
                setRating(courseRanking.relative_score);
              } else if (course?.rating) {
                // Fallback to course rating if ranking not found
                setRating(course.rating);
              }
            } catch (rankingError) {
              // Fallback to course rating
              if (course?.rating) {
                setRating(course.rating);
              }
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        // Retry automatically after a short delay
        if (loadAttempts < 2) {
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

    // Only load review data if we have a course or there's a course error
    if (course || courseError) {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={styles.loadingText}>
          Loading review details...
          {loadAttempts > 0 ? ` (Attempt ${loadAttempts + 1}/3)` : ''}
        </Text>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F5EC',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#234D2C',
    textAlign: 'center',
  },
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