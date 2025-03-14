import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MapPin } from 'lucide-react-native';
import { Course } from '../types/review';
import { usePlayedCourses } from '../context/PlayedCoursesContext';

interface PlayedCoursesListProps {
  courses: Course[];
  onCoursePress?: (course: Course) => void;
}

// Convert to memoized component to prevent unnecessary re-renders
export const PlayedCoursesList = React.memo(({
  courses,
  onCoursePress,
}: PlayedCoursesListProps) => {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  // Get the global course state
  const { playedCourses: globalPlayedCourses } = usePlayedCourses();
  
  // Add internal state to persist the courses data
  const [internalCourses, setInternalCourses] = useState<Course[]>(
    // Initialize with data from props or context to avoid empty initial render
    courses && courses.length > 0 ? courses : 
    globalPlayedCourses && globalPlayedCourses.length > 0 ? globalPlayedCourses : 
    []
  );
  
  // Prevent too many state updates with this ref
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE_MS = 300;
  
  // Add component lifecycle logging - minimal to reduce overhead
  useEffect(() => {
    console.log('📌 PlayedCoursesList Mounted');
    return () => console.log('📌 PlayedCoursesList Unmounted');
  }, []);
  
  // Update internal state only when we get non-empty courses data - with throttling
  useEffect(() => {
    // Skip frequent updates to reduce render cycles
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_THROTTLE_MS) {
      return;
    }
    
    // Only log course count, not full objects to reduce log overhead
    const courseCount = courses?.length || 0;
    
    // Only update if we receive valid, non-empty data
    if (courses && Array.isArray(courses) && courses.length > 0) {
      lastUpdateRef.current = now;
      setInternalCourses(courses);
    } else {
      // Check if we have data in the global context
      if (globalPlayedCourses && globalPlayedCourses.length > 0) {
        lastUpdateRef.current = now;
        setInternalCourses(globalPlayedCourses);
      }
      // If both are empty, preserve existing internal data
    }
  }, [courses, globalPlayedCourses]);
  
  // Reset scroll position when component remounts, but keep it less frequent
  const resetScroll = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
    }
  }, []);
  
  useEffect(() => {
    // Only reset scroll when component first mounts
    resetScroll();
  }, [resetScroll]);

  // Memoize expensive calculations
  const getPriceLevel = useCallback((level: number) => {
    return '$'.repeat(Math.min(level, 5));
  }, []);

  const getScoreColor = useCallback((score: number) => {
    if (score >= 7.0) return '#22c55e'; // Green for good scores (7.0-10.0)
    if (score >= 3.0) return '#eab308'; // Yellow for average scores (3.0-6.9)
    return '#ef4444'; // Red for poor scores (0.0-2.9)
  }, []);

  // Get screen dimensions for responsive layout - memoize to prevent recalculations
  const screenWidth = useMemo(() => Dimensions.get('window').width, []);
  
  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Extra padding for tab bar
    },
    courseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: screenWidth - (theme.spacing.md * 2), // Ensure width matches screen
    },
    courseName: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      flexWrap: 'wrap', // Allow text to wrap
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      flexWrap: 'wrap', // Allow wrapping for long locations
    },
    locationText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
      flex: 1, // Take remaining space
      flexWrap: 'wrap', // Allow text to wrap
    },
    detailsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'nowrap', // Don't allow wrapping here
    },
    leftSection: {
      flex: 1,
    },
    courseType: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignSelf: 'flex-start',
      maxWidth: '100%', // Limit width
    },
    courseTypeText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
    },
    priceLevel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    rightSection: {
      flex: 1,
      alignItems: 'flex-end',
    },
    scoreContainer: {
      width: 48,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreText: {
      fontSize: 20,
      fontWeight: '600',
      color: '#ffffff',
    },
    emptyState: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    }
  }), [theme, screenWidth]);

  // IMPORTANT: Memoize coursesToRender calculation but initialize with valid data
  const coursesToRender = useMemo(() => {
    // Immediately use whatever data is available (props > internal state > context)
    return (courses && courses.length > 0) ? courses : 
      (internalCourses && internalCourses.length > 0) ? internalCourses :
      (globalPlayedCourses && globalPlayedCourses.length > 0) ? globalPlayedCourses :
      [];
  }, [courses, internalCourses, globalPlayedCourses]);
  
  // Memoize the course press handler
  const handleCoursePress = useCallback((course: Course) => {
    onCoursePress?.(course);
  }, [onCoursePress]);
  
  // Check if we have ANY courses to display
  if (!coursesToRender || coursesToRender.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.emptyState]}>
          <Text style={styles.emptyStateText}>No courses found</Text>
          <Text style={[styles.emptyStateText, {fontSize: 13, marginTop: 10}]}>
            Try adding some course reviews to see them here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always"
        removeClippedSubviews={Platform.OS === 'android'} // Only use on Android
        scrollEventThrottle={16} // Optimize scroll performance
        maxToRenderPerBatch={5} // Limit batch rendering for better performance
        windowSize={5} // Keep fewer items in memory
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {coursesToRender.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={styles.courseCard}
            onPress={() => handleCoursePress(course)}
            activeOpacity={0.7}
          >
            <Text style={styles.courseName} numberOfLines={2}>{course.name}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={16} color={theme.colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={2}>{course.location}</Text>
            </View>
            <View style={styles.detailsContainer}>
              <View style={styles.leftSection}>
                <View style={styles.courseType}>
                  <Text style={styles.courseTypeText} numberOfLines={1}>{course.type}</Text>
                </View>
              </View>
              
              <View style={styles.centerSection}>
                <Text style={styles.priceLevel}>{getPriceLevel(course.price_level)}</Text>
              </View>
              
              <View style={styles.rightSection}>
                <View 
                  style={[
                    styles.scoreContainer, 
                    { backgroundColor: getScoreColor(course.rating || 0) }
                  ]}
                >
                  <Text style={styles.scoreText}>
                    {course.rating ? course.rating.toFixed(1) : '-'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
});

// Add display name for debugging
PlayedCoursesList.displayName = 'PlayedCoursesList'; 