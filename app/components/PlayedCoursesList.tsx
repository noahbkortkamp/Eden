import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { MapPin } from 'lucide-react-native';
import { Course } from '../types/review';

interface PlayedCoursesListProps {
  courses: Course[];
  onCoursePress?: (course: Course) => void;
}

export const PlayedCoursesList: React.FC<PlayedCoursesListProps> = ({
  courses,
  onCoursePress,
}) => {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Reset scroll position when component remounts
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
    }
    
    // The return function will cleanup when component unmounts
    return () => {
      // Any additional cleanup if needed
    };
  }, []);

  const getPriceLevel = (level: number) => {
    return '$'.repeat(Math.min(level, 5));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return '#2563eb'; // Blue for excellent scores
    if (score >= 7.0) return '#3b82f6'; // Lighter blue for good scores
    if (score >= 5.0) return '#6366f1'; // Indigo for average scores
    return '#818cf8'; // Light indigo for below average
  };

  // Get screen dimensions for responsive layout
  const screenWidth = Dimensions.get('window').width;
  
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
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
  });

  if (!courses || courses.length === 0) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <Text style={styles.emptyStateText}>No courses found</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      bounces={true}
      overScrollMode="always"
      removeClippedSubviews={true} // Performance optimization
    >
      {courses.map((course) => (
        <TouchableOpacity
          key={course.id}
          style={styles.courseCard}
          onPress={() => onCoursePress?.(course)}
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
  );
}; 