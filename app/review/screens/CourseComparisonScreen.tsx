import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { CourseComparisonProps } from '../../types/review';
import { useTheme } from '../../theme/ThemeProvider';

const { width } = Dimensions.get('window');

export const CourseComparisonScreen: React.FC<CourseComparisonProps> = ({
  courseA,
  courseB,
  onSelect,
  onSkip,
}) => {
  const theme = useTheme();

  if (!courseA || !courseB) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    try {
      console.log('Selecting course:', {
        selectedId,
        notSelectedId,
        selectedCourse: courseA?.name,
        notSelectedCourse: courseB?.name
      });
      await onSelect(selectedId, notSelectedId);
    } catch (error) {
      console.error('Failed to submit comparison:', error);
    }
  };

  const handleSkip = async () => {
    try {
      console.log('Skipping comparison:', {
        courseAId: courseA?.id,
        courseBId: courseB?.id,
        courseAName: courseA?.name,
        courseBName: courseB?.name
      });
      await onSkip(courseA.id, courseB.id);
    } catch (error) {
      console.error('Failed to skip comparison:', error);
    }
  };

  // Add debug logging for course data
  console.log('Course data:', {
    courseA: {
      id: courseA?.id,
      name: courseA?.name
    },
    courseB: {
      id: courseB?.id,
      name: courseB?.name
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Which course do you prefer?
      </Text>
      
      <View style={styles.coursesContainer}>
        {/* Course A */}
        <TouchableOpacity
          style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleSelect(courseA.id, courseB.id)}
        >
          <View style={styles.courseInfo}>
            <Text style={[styles.courseName, { color: theme.colors.text }]}>
              {courseA.name}
            </Text>
            <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
              {courseA.location}
            </Text>
            <View style={styles.statsContainer}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                ⭐️ {courseA.average_rating?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                📝 {courseA.total_reviews || 0} reviews
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>VS</Text>

        {/* Course B */}
        <TouchableOpacity
          style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleSelect(courseB.id, courseA.id)}
        >
          <View style={styles.courseInfo}>
            <Text style={[styles.courseName, { color: theme.colors.text }]}>
              {courseB.name}
            </Text>
            <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
              {courseB.location}
            </Text>
            <View style={styles.statsContainer}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                ⭐️ {courseB.average_rating?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                📝 {courseB.total_reviews || 0} reviews
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.skipButton, { backgroundColor: theme.colors.surface }]} 
        onPress={() => onSkip(courseA.id, courseB.id)}
      >
        <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
          Too tough to choose
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  coursesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  courseCard: {
    width: width - 32,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseInfo: {
    gap: 4,
  },
  courseName: {
    fontSize: 24,
    fontWeight: '600',
  },
  courseLocation: {
    fontSize: 16,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  statText: {
    fontSize: 14,
  },
  vsText: {
    fontSize: 20,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 