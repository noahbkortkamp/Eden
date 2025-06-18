import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { CourseComparisonProps, SentimentRating } from '../../types/review';
import { useEdenTheme } from '../../theme/ThemeProvider';
import { Button } from '../../components/eden/Button';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';

const { width } = Dimensions.get('window');

// 🎨 EDEN DESIGN SYSTEM: Define sentiment colors using Eden feedback colors
const SENTIMENT_COLORS = {
  liked: '#9ACE8E',   // Eden positive feedback color
  fine: '#F2E7C9',    // Eden neutral feedback color
  didnt_like: '#F6D3D1' // Eden negative feedback color
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
  const theme = useEdenTheme();
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
    
    // Calculate current comparison number based on how many we've completed
    // remainingComparisons represents how many are left AFTER the current one
    const current = totalComparisons - remainingComparisons + 1;
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

  // 🎨 EDEN DESIGN SYSTEM: Updated styles to use proper Eden tokens
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
      ...theme.typography.h1, // 🎨 Use Eden h1 typography
      textAlign: 'center',
      color: theme.colors.text,
    },
    subtitle: {
      ...theme.typography.body, // 🎨 Use Eden body typography
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
      backgroundColor: theme.colors.border, // 🎨 Use Eden border color
      borderRadius: theme.borderRadius.xs, // 🎨 Use Eden border radius
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.borderRadius.xs, // 🎨 Use Eden border radius
      // Note: React Native doesn't support CSS transitions
    },
    progressText: {
      ...theme.typography.bodySmall, // 🎨 Use Eden bodySmall typography
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
      borderRadius: theme.borderRadius.lg, // 🎨 Use Eden border radius
      padding: theme.spacing.lg,
      ...theme.shadows.md, // 🎨 Use Eden shadow
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border, // 🎨 Use Eden border color
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardPressed: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      transform: [{ scale: 0.98 }],
      backgroundColor: `${theme.colors.primary}10`, // 🎨 Use Eden primary with opacity
    },
    courseNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    courseName: {
      ...theme.typography.h2, // 🎨 Use Eden h2 typography instead of hardcoded values
      color: theme.colors.text,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
    },
    courseLocation: {
      ...theme.typography.body, // 🎨 Use Eden body typography
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    ratingText: {
      ...theme.typography.body, // 🎨 Use Eden body typography
      fontWeight: theme.typography.h3.fontWeight, // 🎨 Use Eden semibold weight
      fontSize: 16, // Make rating text larger and more visible
      fontWeight: '600', // Make it bold for better visibility
    },
    vsContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full, // 🎨 Use Eden full border radius for circle
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: -theme.spacing.lg,
      zIndex: 1,
      ...theme.shadows.sm, // 🎨 Use Eden shadow
    },
    vsText: {
      ...theme.typography.button, // 🎨 Use Eden button typography
      color: '#FFFFFF', // Change to white for better visibility
      fontWeight: '600', // Make it bold
    },
    // 🎨 EDEN DESIGN SYSTEM: Updated skip button container for Eden Button component
    skipButtonContainer: {
      alignSelf: 'center',
      marginBottom: theme.spacing.xl, // Reduced from xxl to move button higher
      marginTop: theme.spacing.lg, // Reduced from xxl to move button higher
      // Removed conflicting background styling to prevent button flashing
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
                <Text style={[styles.ratingText, { color: ratingColor }]}>{formatScoreForDisplay(Number(previousCourseRating)).toFixed(1)}</Text>
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
                <Text style={[styles.ratingText, { color: ratingColor }]}>{formatScoreForDisplay(Number(previousCourseRating)).toFixed(1)}</Text>
              </Text>
            ) : (
              <Text style={styles.courseLocation}>
                {courseB.location}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
      
      {/* 🎨 EDEN DESIGN SYSTEM: Use Eden Button component for consistent styling */}
      <View style={styles.skipButtonContainer}>
        <Button
          label="Too tough to choose"
          variant="primary" // Changed to primary variant for better visibility
          onPress={handleSkip}
          disabled={isSelecting}
        />
      </View>
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