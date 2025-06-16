import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// 🚀 Phase 1.3: Memoized CourseComparisonScreen to prevent unnecessary re-renders
export const CourseComparisonScreen: React.FC<CourseComparisonProps> = React.memo(({
  courseA,
  courseB,
  previousCourseId,
  previousCourseRating,
  totalReviewCount,
  originalSentiment = 'liked', // Default to liked if not provided
  remainingComparisons,
  totalComparisons,
  onSelect,
  onSkip,
}) => {
  const theme = useTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  
  // 🚀 Phase 1.3: Memoize color calculation to prevent recalculation on every render
  const ratingColor = useMemo(() => {
    return SENTIMENT_COLORS[originalSentiment] || SENTIMENT_COLORS.liked;
  }, [originalSentiment]);

  // 🚀 Phase 1.3: Memoize course review status to prevent recalculation
  const courseReviewStatus = useMemo(() => {
    return {
      isACourseReviewed: previousCourseId === courseA?.id,
      isBCourseReviewed: previousCourseId === courseB?.id,
      shouldShowScores: totalReviewCount >= 10
    };
  }, [previousCourseId, courseA?.id, courseB?.id, totalReviewCount]);

  // 🚀 Calculate progress for progress bar
  const progressData = useMemo(() => {
    if (!remainingComparisons || !totalComparisons) return null;
    
    const current = totalComparisons - remainingComparisons + 1; // Current comparison number (1st, 2nd, 3rd, etc.)
    const progress = current / totalComparisons;
    
    return {
      current,
      total: totalComparisons,
      progress: Math.max(0, Math.min(1, progress)) // Clamp between 0 and 1
    };
  }, [remainingComparisons, totalComparisons]);

  // Reset selecting state when courses change
  useEffect(() => {
    if (courseA && courseB) {
      setIsSelecting(false);
    }
  }, [courseA?.id, courseB?.id]);

  // 🚀 Phase 1.3: Optimize handler functions with useCallback to prevent re-renders
  const handleSelect = useCallback(async (selectedId: string, notSelectedId: string) => {
    try {
      // Prevent double-selection
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      // 🚀 Phase 1.3: Reduced logging - only log important comparisons
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Comparison:', {
          selected: selectedId.substring(0, 8),
          rejected: notSelectedId.substring(0, 8),
        });
      }
      
      // Directly call onSelect which will navigate to the next comparison
      await onSelect(selectedId, notSelectedId);
    } catch (error) {
      console.error('Failed to submit comparison:', error);
      setIsSelecting(false);
    }
  }, [isSelecting, onSelect]);

  const handleSkip = useCallback(async () => {
    try {
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('⏭️ Skipped comparison:', {
          courseA: courseA?.id?.substring(0, 8),
          courseB: courseB?.id?.substring(0, 8),
        });
      }
      
      await onSkip(courseA!.id, courseB!.id);
    } catch (error) {
      console.error('Failed to skip comparison:', error);
      setIsSelecting(false);
    }
  }, [isSelecting, onSkip, courseA, courseB]);

  // 🚀 Phase 1.3: Memoize styles to prevent recalculation
  const styles = useMemo(() => StyleSheet.create({
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
    progressContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    progressBar: {
      width: 200,
      height: 6,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
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
      marginBottom: theme.spacing.xl * 2, // More space from bottom
      marginTop: theme.spacing.xl * 2,    // More space from course cards above
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    }
  }), [theme]); // Only recalculate when theme changes

  if (!courseA || !courseB) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Which course do you prefer?
        </Text>
        {progressData ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progressData.progress * 100}%`,
                    backgroundColor: theme.colors.primary 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {progressData.current} of {progressData.total} comparisons
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Tap on your favorite</Text>
        )}
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
            {courseReviewStatus.isACourseReviewed && previousCourseRating !== undefined && !isNaN(Number(previousCourseRating)) && courseReviewStatus.shouldShowScores ? (
              <Text style={styles.courseLocation}>
                <Text>{courseA.location}</Text>
                <Text> • </Text>
                <Text style={[styles.ratingText, { color: ratingColor }]}>{Number(previousCourseRating).toFixed(1)}</Text>
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
            {courseReviewStatus.isBCourseReviewed && previousCourseRating !== undefined && !isNaN(Number(previousCourseRating)) && courseReviewStatus.shouldShowScores ? (
              <Text style={styles.courseLocation}>
                <Text>{courseB.location}</Text>
                <Text> • </Text>
                <Text style={[styles.ratingText, { color: ratingColor }]}>{Number(previousCourseRating).toFixed(1)}</Text>
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
}, (prevProps, nextProps) => {
  // 🚀 Phase 1.3: Custom comparison function for React.memo to prevent unnecessary re-renders
  return (
    prevProps.courseA?.id === nextProps.courseA?.id &&
    prevProps.courseB?.id === nextProps.courseB?.id &&
    prevProps.previousCourseId === nextProps.previousCourseId &&
    prevProps.previousCourseRating === nextProps.previousCourseRating &&
    prevProps.totalReviewCount === nextProps.totalReviewCount &&
    prevProps.originalSentiment === nextProps.originalSentiment &&
    prevProps.remainingComparisons === nextProps.remainingComparisons &&
    prevProps.totalComparisons === nextProps.totalComparisons &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onSkip === nextProps.onSkip
  );
}); 