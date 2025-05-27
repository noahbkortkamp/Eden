import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { OnboardingFirstReviewSuccessScreen } from '../review/screens/OnboardingFirstReviewSuccessScreen';

// Consistent interface for route parameters
interface SuccessRouteParams {
  courseName: string;
  courseLocation?: string;
  datePlayed: string;
  timestamp?: string; // Optional timestamp for cache busting
}

export default function OnboardingFirstReviewSuccessRoute() {
  // Simple initialization with loading state
  const [initialized, setInitialized] = useState(false);
  const [parsedData, setParsedData] = useState<{
    courseName: string;
    courseLocation?: string;
    datePlayed: Date;
  } | null>(null);
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Get route parameters once
  const params = useLocalSearchParams<SuccessRouteParams>();
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark component as unmounted to prevent state updates
      isMounted.current = false;
      console.log('🎯 OnboardingFirstReviewSuccessRoute unmounted');
    };
  }, []);
  
  // Initialize component on mount (optimized for speed)
  useEffect(() => {
    if (initialized) return;
    
    // Immediately start initialization
    const init = () => {
      try {
        // Parse parameters (optimized for speed)
        const courseName = params.courseName 
          ? decodeURIComponent(params.courseName) 
          : 'Course';
        
        const courseLocation = params.courseLocation
          ? decodeURIComponent(params.courseLocation)
          : undefined;
        
        const dateString = params.datePlayed
          ? decodeURIComponent(params.datePlayed)
          : new Date().toISOString();
        
        // Create date object with simple validation
        let parsedDate = new Date(dateString);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
        
        // Set the data if component is still mounted
        if (isMounted.current) {
          setParsedData({
            courseName,
            courseLocation,
            datePlayed: parsedDate
          });
          
          // Mark as initialized immediately after setting data
          setInitialized(true);
          
          // Log parsed values (after setting state for faster rendering)
          console.log('🎯 OnboardingFirstReviewSuccessRoute parsed values:', {
            courseName,
            courseLocation,
            datePlayed: parsedDate.toISOString()
          });
        }
      } catch (err) {
        console.error('Error in OnboardingFirstReviewSuccessRoute initialization:', err);
        // Still mark as initialized to prevent infinite retries
        if (isMounted.current) {
          setInitialized(true);
        }
      }
    };
    
    // Execute initialization immediately
    init();
  }, [params, initialized]);
  
  // Render the success screen as soon as possible
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade', // Changed from 'slide_from_bottom' for faster appearance
          gestureEnabled: false,
          contentStyle: { backgroundColor: '#fff' },
          animationTypeForReplace: 'pop', // Changed to 'pop' for faster transition
          freezeOnBlur: true,
          autoHideHomeIndicator: false,
          animationDuration: 150, // Explicitly set a faster animation duration
        }}
      />
      
      {!initialized || !parsedData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#234D2C" />
          <Text style={styles.loadingText}>Loading your review success...</Text>
        </View>
      ) : (
        <OnboardingFirstReviewSuccessScreen
          courseName={parsedData.courseName}
          courseLocation={parsedData.courseLocation}
          datePlayed={parsedData.datePlayed}
        />
      )}
    </>
  );
}

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
  }
}); 