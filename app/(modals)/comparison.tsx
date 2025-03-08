import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { CourseComparisonScreen } from '../review/screens/CourseComparisonScreen';
import { Course } from '../types/review';
import { mockCourses } from '../api/mockData';
import { useReview } from '../review/context/ReviewContext';
import { useTheme } from '../theme/ThemeProvider';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For testing, we'll use mock data
    const courseAData = mockCourses.find(c => c.course_id === courseAId);
    const courseBData = mockCourses.find(c => c.course_id === courseBId);
    
    if (courseAData) setCourseA(courseAData);
    if (courseBData) setCourseB(courseBData);
    
    setIsLoading(false);
  }, [courseAId, courseBId]);

  // If no courses are found, just close the modal
  if (!isLoading && (!courseA || !courseB)) {
    router.back();
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        }}
      />
      <View style={styles.container}>
        <CourseComparisonScreen
          courseA={courseA}
          courseB={courseB}
          onSelect={handleComparison}
          onSkip={skipComparison}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 