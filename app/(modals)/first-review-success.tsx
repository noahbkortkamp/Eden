import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getCourse } from '../utils/courses';

// Redirect wrapper for compatibility
export default function FirstReviewSuccessRedirect() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ 
    courseId: string; 
    datePlayed: string;
    fromOnboarding: string;
  }>();
  
  console.log('⚠️ Deprecated first-review-success route accessed, redirecting to new screen');
  console.log('Params:', JSON.stringify(params, null, 2));
  
  useEffect(() => {
    const redirectToNewScreen = async () => {
      try {
        const courseId = params.courseId;
        
        if (!courseId) {
          console.error('Missing courseId parameter, redirecting to home');
          router.replace('/(tabs)/lists');
          return;
        }
        
        // Get course details
        let courseName = 'Course';
        let courseLocation = '';
        
        try {
          const courseDetails = await getCourse(courseId);
          if (courseDetails) {
            courseName = courseDetails.name;
            courseLocation = courseDetails.location || '';
          }
        } catch (error) {
          console.error('Error fetching course details:', error);
        }
        
        // Redirect to new screen with appropriate parameters
        console.log('Redirecting to onboarding-first-review-success with course:', courseName);
        
        router.replace({
          pathname: '/(modals)/onboarding-first-review-success',
          params: {
            courseName: encodeURIComponent(courseName),
            courseLocation: courseLocation ? encodeURIComponent(courseLocation) : undefined,
            datePlayed: params.datePlayed ? encodeURIComponent(params.datePlayed) : encodeURIComponent(new Date().toISOString())
          }
        });
      } catch (error) {
        console.error('Error in redirect:', error);
        router.replace('/(tabs)/lists');
      }
    };
    
    redirectToNewScreen();
  }, [params, router, user]);
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#234D2C" />
      <Text style={styles.loadingText}>
        Loading your review success...
      </Text>
    </View>
  );
}

// Simple styles for loading state
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
}); 