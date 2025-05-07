import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { CourseComparisonProps, SentimentRating } from '../../types/review';
import { useTheme } from '../../theme/ThemeProvider';

const { width } = Dimensions.get('window');

// Define sentiment colors
const SENTIMENT_COLORS = {
  liked: '#3CB371', // Green
  fine: '#FFA500',  // Orange/Yellow
  didnt_like: '#DC3545' // Red
};

export const CourseComparisonScreen: React.FC<CourseComparisonProps> = ({
  courseA,
  courseB,
  previousCourseId,
  previousCourseRating,
  originalSentiment = 'liked', // Default to liked if not provided
  onSelect,
  onSkip,
}) => {
  const theme = useTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Get the appropriate color based on sentiment
  const getRatingColor = () => {
    return SENTIMENT_COLORS[originalSentiment] || SENTIMENT_COLORS.liked;
  };

  // Reset selecting state when courses change
  useEffect(() => {
    if (courseA && courseB) {
      setIsSelecting(false);
    }
  }, [courseA?.id, courseB?.id]);

  if (!courseA || !courseB) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    try {
      // Prevent double-selection
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      console.log('Selecting course:', {
        selectedId,
        notSelectedId,
      });
      
      // Directly call onSelect which will navigate to the next comparison
      await onSelect(selectedId, notSelectedId);
    } catch (error) {
      console.error('Failed to submit comparison:', error);
      setIsSelecting(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      console.log('Skipping comparison:', {
        courseAId: courseA?.id,
        courseBId: courseB?.id,
      });
      
      await onSkip(courseA.id, courseB.id);
    } catch (error) {
      console.error('Failed to skip comparison:', error);
      setIsSelecting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
    coursesContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xl,
    },
    courseCard: {
      width: width - 32,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardPressed: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      transform: [{ scale: 0.98 }],
      backgroundColor: `${theme.colors.primary}10`,
    },
    courseNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    courseName: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
    },
    courseLocation: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    ratingText: {
      fontSize: 20,
      fontWeight: '600',
    },
    vsContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: -theme.spacing.lg,
      zIndex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    vsText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    skipButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    }
  });

  // Determine if each course has been previously reviewed
  const isACourseReviewed = previousCourseId === courseA.id;
  const isBCourseReviewed = previousCourseId === courseB.id;

  console.log(`CourseComparisonScreen rendering with rating display:`, {
    courseA: courseA.name,
    courseB: courseB.name,
    previousCourseId,
    previousCourseRating,
    originalSentiment,
    ratingColor: getRatingColor(),
    isACourseReviewed,
    isBCourseReviewed
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Which course do you prefer?
        </Text>
        <Text style={styles.subtitle}>Tap on your favorite</Text>
      </View>
      
      <View style={styles.coursesContainer}>
        {/* Course A */}
        <Pressable
          style={({pressed}) => [
            styles.courseCard, 
            pressed && styles.courseCardPressed
          ]}
          onPress={() => handleSelect(courseA.id, courseB.id)}
          android_ripple={{ color: `${theme.colors.primary}30` }}
          disabled={isSelecting}
        >
          <View>
            <View style={styles.courseNameContainer}>
              <Text style={styles.courseName}>
                {courseA.name}
              </Text>
            </View>
            {isACourseReviewed && previousCourseRating !== undefined ? (
              <Text style={styles.courseLocation}>
                {courseA.location} • <Text style={[styles.ratingText, { color: getRatingColor() }]}>{previousCourseRating.toFixed(1)}</Text>
              </Text>
            ) : (
              <Text style={styles.courseLocation}>
                {courseA.location}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Course B */}
        <Pressable
          style={({pressed}) => [
            styles.courseCard, 
            pressed && styles.courseCardPressed
          ]}
          onPress={() => handleSelect(courseB.id, courseA.id)}
          android_ripple={{ color: `${theme.colors.primary}30` }}
          disabled={isSelecting}
        >
          <View>
            <View style={styles.courseNameContainer}>
              <Text style={styles.courseName}>
                {courseB.name}
              </Text>
            </View>
            {isBCourseReviewed && previousCourseRating !== undefined ? (
              <Text style={styles.courseLocation}>
                {courseB.location} • <Text style={[styles.ratingText, { color: getRatingColor() }]}>{previousCourseRating.toFixed(1)}</Text>
              </Text>
            ) : (
              <Text style={styles.courseLocation}>
                {courseB.location}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
      
      <Pressable 
        style={({pressed}) => [
          styles.skipButton,
          pressed && { opacity: 0.8 }
        ]} 
        onPress={handleSkip}
        disabled={isSelecting}
      >
        <Text style={styles.skipButtonText}>
          Too tough to choose
        </Text>
      </Pressable>
    </View>
  );
}; 