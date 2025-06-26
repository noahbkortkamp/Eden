import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// 🚀 Performance: Memoized CourseComparisonScreen to prevent unnecessary re-renders
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
  
  // 🚀 Performance: Use refs to prevent unnecessary re-renders during selection
  const isSelectingRef = useRef(false);
  const lastSelectionTimeRef = useRef(0);
  
  // 🚀 Performance: Debounce mechanism to prevent rapid selections
  const SELECTION_DEBOUNCE_MS = 300;
  
  // 🚀 Performance: Memoize color calculation to prevent recalculation on every render
  const ratingColor = useMemo(() => {
    return SENTIMENT_COLORS[originalSentiment] || SENTIMENT_COLORS.liked;
  }, [originalSentiment]);

  // 🚀 Performance: Memoize course review status to prevent recalculation
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

  // 🚀 Performance: Optimized selection handler with debouncing
  const handleSelect = useCallback(async (selectedId: string, notSelectedId: string) => {
    try {
      const now = Date.now();
      
      // Prevent rapid double-taps and overlapping selections
      if (isSelectingRef.current || (now - lastSelectionTimeRef.current) < SELECTION_DEBOUNCE_MS) {
        console.log('🚫 Selection blocked - too fast or already selecting');
        return;
      }
      
      isSelectingRef.current = true;
      lastSelectionTimeRef.current = now;
      
      // Execute the selection
      await onSelect(selectedId, notSelectedId);
    } catch (error) {
      console.error('Failed to submit comparison:', error);
    } finally {
      // Reset selection state after a short delay to prevent visual glitches
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  }, [onSelect]);

  // 🚀 Performance: Optimized skip handler with debouncing
  const handleSkip = useCallback(async () => {
    try {
      const now = Date.now();
      
      // Prevent rapid double-taps
      if (isSelectingRef.current || (now - lastSelectionTimeRef.current) < SELECTION_DEBOUNCE_MS) {
        console.log('🚫 Skip blocked - too fast or already selecting');
        return;
      }
      
      isSelectingRef.current = true;
      lastSelectionTimeRef.current = now;
      
      await onSkip(courseA!.id, courseB!.id);
    } catch (error) {
      console.error('Failed to skip comparison:', error);
    } finally {
      // Reset selection state
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  }, [onSkip, courseA, courseB]);

  // 🎨 EDEN DESIGN SYSTEM: Memoized styles to prevent recalculation
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
      ...theme.typography.h1,
      textAlign: 'center',
      color: theme.colors.text,
    },
    subtitle: {
      ...theme.typography.body,
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
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.xs,
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.borderRadius.xs,
    },
    progressText: {
      ...theme.typography.bodySmall,
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
      ...theme.shadows.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      ...theme.typography.h2,
      color: theme.colors.text,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
    },
    courseLocation: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    ratingText: {
      ...theme.typography.body,
      fontWeight: '600',
      fontSize: 16,
    },
    vsContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: -theme.spacing.lg,
      zIndex: 1,
      ...theme.shadows.sm,
    },
    vsText: {
      ...theme.typography.button,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    // 🚀 Performance: Optimized skip button container - removed conflicting styles that cause flashing
    skipButtonContainer: {
      alignSelf: 'center',
      marginBottom: theme.spacing.xl,
      marginTop: theme.spacing.lg,
      // 🚀 Fix: Ensure consistent sizing and positioning to prevent layout shifts
      minHeight: 44, // Standard button height
      justifyContent: 'center',
    }
  }), [theme]); // Only recalculate when theme changes

  // 🚀 Performance: Early return with loading state
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
          disabled={isSelectingRef.current}
          // 🚀 Performance: Optimize hit area and response time
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          delayPressIn={0}
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
          disabled={isSelectingRef.current}
          // 🚀 Performance: Optimize hit area and response time
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          delayPressIn={0}
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
      
      {/* 🚀 Performance: Optimized skip button with fixed styling to prevent flashing */}
      <View style={styles.skipButtonContainer}>
        <Button
          label="Too tough to choose"
          variant="secondary" // 🚀 Fix: Changed back to secondary to prevent style conflicts
          onPress={handleSkip}
          disabled={isSelectingRef.current}
          // 🚀 Performance: Ensure consistent styling
          style={{
            minHeight: 44,
            paddingHorizontal: theme.spacing.lg,
          }}
        />
      </View>
    </View>
  );
}, 
// 🚀 Performance: Enhanced comparison function for React.memo to prevent unnecessary re-renders
(prevProps, nextProps) => {
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