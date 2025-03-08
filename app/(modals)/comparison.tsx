import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { CourseComparisonScreen } from '../review/screens/CourseComparisonScreen';
import { Course } from '../types/review';
import { useReview } from '../review/context/ReviewContext';
import { useTheme } from '../theme/ThemeProvider';
import { getCourse } from '../utils/courses';

export default function ComparisonModal() {
  const { courseAId, courseBId, remainingComparisons } = useLocalSearchParams<{
    courseAId: string;
    courseBId: string;
    remainingComparisons: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const { handleComparison, skipComparison } = useReview();
  const [courseA, setCourseA] = useState<Course | null>(null);
  const [courseB, setCourseB] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        console.log('Loading courses with IDs:', { courseAId, courseBId });
        
        if (!courseAId || !courseBId) {
          throw new Error('Missing course IDs');
        }

        // Load courses in parallel
        const [courseAData, courseBData] = await Promise.all([
          getCourse(courseAId),
          getCourse(courseBId)
        ]).catch(err => {
          console.error('Error loading courses:', err);
          throw err;
        });

        if (!courseAData || !courseBData) {
          throw new Error('Failed to load one or both courses');
        }

        console.log('Loaded courses:', {
          courseA: { id: courseAData.id, name: courseAData.name },
          courseB: { id: courseBData.id, name: courseBData.name }
        });

        setCourseA(courseAData);
        setCourseB(courseBData);
      } catch (err) {
        console.error('Detailed error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
        // After error, wait 2 seconds then return to feed
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [courseAId, courseBId, router]);

  // Use useEffect to handle navigation when no courses are found
  useEffect(() => {
    if (!loading && (!courseA || !courseB)) {
      router.replace('/(tabs)');
    }
  }, [loading, courseA, courseB, router]);

  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    try {
      console.log('Handling comparison selection:', {
        selectedId,
        notSelectedId,
        selectedCourse: courseA?.id === selectedId ? courseA?.name : courseB?.name,
        notSelectedCourse: courseA?.id === notSelectedId ? courseA?.name : courseB?.name
      });
      await handleComparison(selectedId, notSelectedId);
    } catch (error) {
      console.error('Error in comparison selection:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit comparison');
    }
  };

  const handleSkip = async () => {
    try {
      console.log('Handling comparison skip:', {
        courseAId: courseA?.id,
        courseBId: courseB?.id
      });
      await skipComparison(courseA?.id || '', courseB?.id || '');
    } catch (error) {
      console.error('Error in comparison skip:', error);
      setError(error instanceof Error ? error.message : 'Failed to skip comparison');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading courses...
        </Text>
      </View>
    );
  }

  if (error || !courseA || !courseB) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || 'Failed to load courses'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Compare Courses (${remainingComparisons} left)`,
          headerShown: true,
          presentation: 'modal',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CourseComparisonScreen
          courseA={courseA}
          courseB={courseB}
          onSelect={handleSelect}
          onSkip={handleSkip}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  }
}); 