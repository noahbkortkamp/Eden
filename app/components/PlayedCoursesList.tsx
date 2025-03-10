import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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

  const getPriceLevel = (level: number) => {
    return '$'.repeat(Math.min(level, 5));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return '#2563eb'; // Blue for excellent scores
    if (score >= 7.0) return '#3b82f6'; // Lighter blue for good scores
    if (score >= 5.0) return '#6366f1'; // Indigo for average scores
    return '#818cf8'; // Light indigo for below average
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    courseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    courseName: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    locationText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    courseType: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    courseTypeText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    priceLevel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      position: 'absolute',
      right: 80,
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
  });

  return (
    <ScrollView style={styles.container}>
      {courses.map((course) => (
        <TouchableOpacity
          key={course.id}
          style={styles.courseCard}
          onPress={() => onCoursePress?.(course)}
        >
          <Text style={styles.courseName}>{course.name}</Text>
          <View style={styles.locationContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationText}>{course.location}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <View style={styles.courseType}>
              <Text style={styles.courseTypeText}>{course.type}</Text>
            </View>
            <Text style={styles.priceLevel}>{getPriceLevel(course.price_level)}</Text>
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
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}; 