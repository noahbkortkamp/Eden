import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { ReviewScreen } from '../review/screens/ReviewScreen';
import { useReview } from '../review/context/ReviewContext';
import { useTheme } from '../theme/ThemeProvider';
import { getCourse } from '../utils/courses';
import type { Database } from '../utils/database.types';

type Course = Database['public']['Tables']['courses']['Row'];

export default function ReviewModal() {
  const { courseId, fromRound } = useLocalSearchParams<{
    courseId: string;
    fromRound?: string;
  }>();
  const theme = useTheme();
  const { submitReview, isSubmitting, error } = useReview();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        if (!courseId) throw new Error('No course ID provided');
        const data = await getCourse(courseId as string);
        setCourse(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

  const handleSubmit = async (review: Parameters<typeof submitReview>[0]) => {
    try {
      console.log('Submitting review:', review);
      await submitReview(review);
      // Navigation will be handled in the ReviewContext after successful submission
    } catch (error) {
      console.error('Failed to submit review:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        // You might want to show this error message to the user
        // through your error state management
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (loadError || !course) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {loadError || 'Course not found'}
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