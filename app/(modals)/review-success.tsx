import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ReviewSuccessScreen } from '../review/screens/ReviewSuccessScreen';
import { getReviewsForCourse } from '../utils/reviews';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/reviewService';
import { CourseProvider, useCourse } from '../context/CourseContext';
import { rankingService } from '../services/rankingService';

// Inner component that uses the CourseContext
function ReviewSuccessContent() {
  const params = useLocalSearchParams<{ 
    courseId: string; 
    datePlayed: string;
  }>();
  
  console.log('🟢 Review success modal mounted with params:', JSON.stringify(params, null, 2));
  
  const courseId = params.courseId;
  const datePlayedParam = params.datePlayed;
  
  const router = useRouter();
  const { user } = useAuth();
  const { course, isLoading: courseLoading, error: courseError } = useCourse();
  const [isLoading, setIsLoading] = useState(true);
  const [userReviewCount, setUserReviewCount] = useState(0);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (!courseId || !user) {
      console.error('🔴 Missing required params or user not logged in', {
        hasCourseId: !!courseId,
        hasUser: !!user,
        courseId,
        userId: user?.id
      });
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    // If we've tried too many times, give up
    if (loadAttempts >= 3) {
      console.error('🔴 Giving up after too many load attempts');
      setError('Failed to load review data after multiple attempts');
      setIsLoading(false);
      return;
    }

    // Skip the data loading if the course is still loading
    if (courseLoading) {
      console.log('⏳ Course still loading, waiting...');
      return;
    }

    const loadReviewData = async () => {
      try {
        setIsLoading(true);
        console.log(`⏳ Loading success screen data (attempt ${loadAttempts + 1}) for course: ${courseId}`);

        // Get user's total review count to determine if we should show rating
        console.log(`🔍 Fetching review count for user: ${user.id}`);
        const totalReviews = await reviewService.getUserReviewCount(user.id);
        console.log(`📊 User has ${totalReviews} total reviews - ${totalReviews >= 10 ? 'WILL' : 'WILL NOT'} show rating`);
        setUserReviewCount(totalReviews);

        // Get how many times the user has reviewed this course
        console.log(`🔍 Fetching reviews for course: ${courseId}`);
        const courseReviews = await getReviewsForCourse(courseId, user.id);
        console.log(`📊 Found ${courseReviews?.length || 0} reviews for this course`);
        
        if (courseReviews && courseReviews.length > 0) {
          console.log(`ℹ️ User has reviewed this course ${courseReviews.length} times`);
          
          // For the rating, we'll use the course ranking if the user has enough reviews
          if (totalReviews >= 10) {
            try {
              // Get the latest sentiment from course reviews
              const latestReview = courseReviews[0]; // Assuming reviews are sorted by date descending
              const sentiment = latestReview.rating;
              
              console.log(`🔍 Getting rankings for sentiment: "${sentiment}"`);
              const rankings = await rankingService.getUserRankings(user.id, sentiment);
              console.log(`📊 Found ${rankings.length} rankings in the "${sentiment}" category`);
              
              const courseRanking = rankings.find(r => r.course_id === courseId);
              
              if (courseRanking) {
                console.log(`🌟 Found course ranking with score: ${courseRanking.relative_score}`);
                setRating(courseRanking.relative_score);
              } else if (course?.rating) {
                // Fallback to course rating if ranking not found
                console.log(`⚠️ No personal ranking found, using course rating: ${course.rating}`);
                setRating(course.rating);
              } else {
                console.log('⚠️ No rating available for this course');
              }
            } catch (rankingError) {
              console.error('🔴 Error fetching course ranking:', rankingError);
              // Fallback to course rating
              if (course?.rating) {
                console.log(`⚠️ Using fallback course rating due to error: ${course.rating}`);
                setRating(course.rating);
              }
            }
          } else {
            console.log('ℹ️ Not enough reviews to show rating (need 10+)');
          }
        }
        
        console.log('✅ Data loading completed successfully');
        setIsLoading(false);
      } catch (error) {
        console.error('🔴 Error loading review success data:', error);
        
        // Retry automatically after a short delay
        if (loadAttempts < 2) {
          console.log(`🔄 Will retry loading (${loadAttempts + 1}/3) after delay...`);
          setLoadAttempts(prev => prev + 1);
          setTimeout(() => {
            console.log('🔄 Retrying data load now');
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
      console.warn('⚠️ No datePlayedParam provided, using current date');
      return new Date();
    }
    
    try {
      // Handle URL encoding issues with the ISO string
      const decodedDate = decodeURIComponent(datePlayedParam);
      console.log(`🔍 Parsing date: "${decodedDate}"`);
      
      // Try to parse the date string
      const parsedDate = new Date(decodedDate);
      
      // Check if the date is valid (Invalid Date check)
      if (isNaN(parsedDate.getTime())) {
        console.warn(`⚠️ Invalid date format received: "${decodedDate}"`);
        return new Date();
      }
      
      console.log(`📅 Successfully parsed date: ${parsedDate.toISOString()}`);
      return parsedDate;
    } catch (e) {
      console.error('🔴 Error parsing date:', e);
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
    console.error('🔴 Error rendering success screen:', courseError || error);
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

  console.log('🟢 Success screen ready with data:', {
    courseId: course.id,
    courseName: course.name,
    datePlayed: datePlayed.toISOString(),
    rating,
    showRating: userReviewCount >= 10,
    userReviewCount
  });

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <ReviewSuccessScreen 
        datePlayed={datePlayed}
        rating={rating}
        showRating={userReviewCount >= 10}
        visitCount={1}
      />
    </>
  );
}

// Main export that provides the CourseContext
export default function ReviewSuccessModal() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  console.log(`🏁 Initializing ReviewSuccessModal with courseId: ${courseId}`);

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