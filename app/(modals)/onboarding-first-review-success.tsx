import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { OnboardingFirstReviewSuccessScreen } from '../review/screens/OnboardingFirstReviewSuccessScreen';

export default function OnboardingFirstReviewSuccessRoute() {
  // Get route parameters
  const params = useLocalSearchParams<{
    courseName: string;
    courseLocation?: string;
    datePlayed?: string;
  }>();
  
  // Add debugging
  console.log('🎯 OnboardingFirstReviewSuccessRoute mounted with params:', JSON.stringify(params, null, 2));
  
  // Extract parameters
  const { courseName, courseLocation, datePlayed } = params;

  // Parse the date if available
  const parsedDate = datePlayed ? new Date(decodeURIComponent(datePlayed)) : new Date();
  
  // Log parsed values
  useEffect(() => {
    console.log('🎯 OnboardingFirstReviewSuccessRoute parsed values:', {
      courseName: courseName ? decodeURIComponent(courseName) : 'Course',
      courseLocation: courseLocation ? decodeURIComponent(courseLocation) : undefined,
      datePlayed: parsedDate.toISOString()
    });
  }, [courseName, courseLocation, datePlayed, parsedDate]);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <OnboardingFirstReviewSuccessScreen
        courseName={decodeURIComponent(courseName || 'Course')}
        courseLocation={courseLocation ? decodeURIComponent(courseLocation) : undefined}
        datePlayed={parsedDate}
      />
    </>
  );
} 