import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CourseProvider, useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { FirstReviewSuccessScreen } from '../review/screens/FirstReviewSuccessScreen';

// Inner component that uses the CourseContext
function FirstReviewSuccessContent() {
  const params = useLocalSearchParams<{ 
    courseId: string; 
    datePlayed: string;
  }>();
  
  console.log('🎉 First Review Success modal mounted with params:', JSON.stringify(params, null, 2));
  
  const courseId = params.courseId;
  const datePlayedParam = params.datePlayed;
  
  const router = useRouter();
  const { user } = useAuth();
  const { course, isLoading: courseLoading, error: courseError } = useCourse();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Skip the data loading if the course is still loading
    if (courseLoading) {
      console.log('⏳ Course still loading, waiting...');
      return;
    }

    // Once course is loaded, we're ready to show the success screen
    setIsLoading(false);
  }, [courseId, user, courseLoading]);

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
        </Text>
      </View>
    );
  }

  if (courseError || error || !course) {
    console.error('🔴 Error rendering first review success screen:', courseError || error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {courseError || error || 'Failed to load review data'}
        </Text>
        <Text 
          style={styles.backLink}
          onPress={() => router.replace('/(tabs)')}
        >
          Return to home
        </Text>
      </View>
    );
  }

  console.log('🟢 First Review Success screen ready with data:', {
    courseId: course.id,
    courseName: course.name,
    datePlayed: datePlayed.toISOString(),
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
      
      <FirstReviewSuccessScreen 
        datePlayed={datePlayed}
        courseName={course.name}
        courseLocation={course.location}
      />
    </>
  );
}

// Main export that provides the CourseContext
export default function FirstReviewSuccessModal() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  console.log(`🏁 Initializing FirstReviewSuccessModal with courseId: ${courseId}`);

  return (
    <CourseProvider initialCourseId={courseId}>
      <FirstReviewSuccessContent />
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    fontSize: 16,
    color: '#e53935',
    textAlign: 'center',
    marginBottom: 20,
  },
  backLink: {
    fontSize: 16,
    color: '#234D2C',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
}); 