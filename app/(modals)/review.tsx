import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { ReviewScreen } from '../review/screens/ReviewScreen';
import { Course } from '../types/review';
import { mockCourses } from '../api/mockData';
import { useReview } from '../review/context/ReviewContext';
import { useTheme } from '../theme/ThemeProvider';

export default function ReviewModal() {
  const { courseId, fromRound } = useLocalSearchParams<{
    courseId: string;
    fromRound?: string;
  }>();
  const theme = useTheme();
  const { submitReview, isSubmitting, error } = useReview();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For testing, we'll use mock data instead of an API call
    const selectedCourse = mockCourses.find(c => c.course_id === courseId);
    if (selectedCourse) {
      setCourse(selectedCourse);
    }
    setIsLoading(false);
  }, [courseId]);

  const handleSubmit = async (review: Parameters<typeof submitReview>[0]) => {
    try {
      await submitReview(review);
      // Navigation will be handled in the ReviewContext after successful submission
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Course not found
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Review Course',
          headerShown: true,
          presentation: 'modal',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ReviewScreen 
          course={course} 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          error={error}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 