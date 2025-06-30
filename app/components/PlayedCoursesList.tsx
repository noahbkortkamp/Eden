import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, SafeAreaView, Platform, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useEdenTheme } from '../theme/ThemeProvider';
import { MapPin, DollarSign, Calendar } from 'lucide-react-native';
import { Course } from '../types/review';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Heading3, BodyText, SmallText } from './eden/Typography';
import { Button } from './eden/Button';
import { EmptyTabState } from './eden/Tabs';
import { Card } from './eden/Card';
import { Icon } from './eden/Icon';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';

interface PlayedCoursesListProps {
  courses: Course[];
  handleCoursePress?: (course: Course) => void;
  showScores?: boolean;
}

// Convert to memoized component to prevent unnecessary re-renders
export const PlayedCoursesList = React.memo(({
  courses,
  handleCoursePress,
  showScores = false,
}: PlayedCoursesListProps) => {
  const theme = useEdenTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Phase 2: Use context dataFingerprint for efficient change detection
  const { playedCourses: globalPlayedCourses, dataFingerprint } = usePlayedCourses();
  
  // Phase 2: Simplified internal state - no more complex throttling logic
  const [internalCourses, setInternalCourses] = useState<Course[]>(
    // Initialize with data from props or context to avoid empty initial render
    courses && courses.length > 0 ? courses : 
    globalPlayedCourses && globalPlayedCourses.length > 0 ? globalPlayedCourses : 
    []
  );
  
  // Phase 2: Remove unnecessary throttling since context now has fingerprint-based updates
  
  // Add component lifecycle logging - minimal to reduce overhead
  useEffect(() => {
    console.log('📌 PlayedCoursesList Mounted');
    
    return () => {
      console.log('📌 PlayedCoursesList Unmounted');
    };
  }, []);
  
  // Phase 2: Optimized state update logic using context fingerprint
  useEffect(() => {
    // Only update if we receive valid, non-empty data
    if (courses && Array.isArray(courses) && courses.length > 0) {
      setInternalCourses(courses);
    } else if (globalPlayedCourses && globalPlayedCourses.length > 0) {
      // Check if we have data in the global context
      setInternalCourses(globalPlayedCourses);
    }
    // If both are empty, preserve existing internal data
  }, [courses, dataFingerprint]); // Use dataFingerprint instead of globalPlayedCourses directly
  
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

  // Phase 2: Memoized helper functions for better performance
  const getPriceLevel = useCallback((level: number) => {
    return '$'.repeat(Math.min(level, 5));
  }, []);
  
  const getScoreColor = useCallback((score: number) => {
    if (score >= 7.0) return theme.colors.success; // Green for good scores (7.0-10.0)
    if (score >= 3.0) return theme.colors.warning; // Yellow for average scores (3.0-6.9)
    return theme.colors.error; // Red for poor scores (0.0-2.9)
  }, [theme.colors]);

  // Phase 2: Enhanced memoized coursesToRender calculation
  const coursesToRender = useMemo(() => {
    // Immediately use whatever data is available (props > internal state > context)
    const result = (courses && courses.length > 0) ? courses : 
      (internalCourses && internalCourses.length > 0) ? internalCourses :
      (globalPlayedCourses && globalPlayedCourses.length > 0) ? globalPlayedCourses : [];
    
    // Phase 2: Add validation to ensure data quality
    return result.filter(course => course && course.id && course.name);
  }, [courses, internalCourses, globalPlayedCourses]);

  // Handle course click
  const onCourseSelect = useCallback((course: Course) => {
    // Prefer props click handler, but have a default fallback that's useful
    if (handleCoursePress) {
      handleCoursePress(course);
    } else {
      // Default behavior - navigate to course details
      router.push({
        pathname: `/course/${course.id}`,
        params: { id: course.id }
      });
    }
  }, [handleCoursePress]);

  // Phase 2: Memoized empty state component
  const emptyState = useMemo(() => (
    <EmptyTabState
      message="You haven't played any courses yet. Start by searching for a course to review."
      icon="Golf"
    />
  ), []);

  // Render empty state
  if (coursesToRender.length === 0) {
    return emptyState;
  }

  // Phase 2: Memoized styles to prevent recreation on every render
  const containerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: theme.colors.background
  }), [theme.colors.background]);

  const scrollContentStyle = useMemo(() => ({
    flexGrow: 1,
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Extra padding for tab bar
  }), [theme.spacing.md]);

  return (
    <SafeAreaView style={containerStyle}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={true}
      >
        {coursesToRender.map((course, index) => {
          // Format date if available
          const datePlayed = course.date_played ? 
            format(new Date(course.date_played), 'MMM d, yyyy') : null;
            
          return (
            <Card 
              key={course.id}
              variant="course"
              pressable
              onPress={() => onCourseSelect(course)}
              style={{ marginBottom: theme.spacing.md }}
            >
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Heading3 numberOfLines={2} style={{ marginBottom: theme.spacing.sm, flexWrap: 'wrap', paddingRight: 50 }}>
                    {index + 1}. {course.name}
                  </Heading3>
                  
                  {datePlayed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      <Calendar size={14} color={theme.colors.textSecondary} />
                      <SmallText style={{ marginLeft: theme.spacing.sm, color: theme.colors.textSecondary }}>
                        {datePlayed}
                      </SmallText>
                    </View>
                  )}
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, flexWrap: 'wrap' }}>
                    <MapPin size={16} color={theme.colors.textSecondary} />
                    <SmallText 
                      style={{ marginLeft: theme.spacing.sm, color: theme.colors.textSecondary }} 
                      numberOfLines={2}
                    >
                      {course.location || 'Unknown location'}
                    </SmallText>
                  </View>
                </View>
                
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                }}>
                  <View style={{
                    backgroundColor: getScoreColor(course.rating || 0),
                    borderRadius: theme.borderRadius.full,
                    width: 36,
                    height: 36,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <SmallText style={{ 
                      color: theme.colors.text,
                      fontWeight: theme.typography.button.fontWeight,
                      fontSize: 15,
                    }}>
                      {(showScores) ? (course.rating ? formatScoreForDisplay(course.rating).toFixed(1) : '-') : '-'}
                    </SmallText>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
});

// Eden styled styles
const edenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F5EC', // Eden background color
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Extra padding for tab bar
  },
  courseCard: {
    marginBottom: 16,
  },
  courseName: {
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  datePlayedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  datePlayedText: {
    marginLeft: 8,
    color: '#4A5E50', // Eden secondary text color
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  locationText: {
    marginLeft: 8,
    color: '#4A5E50', // Eden secondary text color
    flex: 1,
    flexWrap: 'wrap',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
  },
  courseType: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F3ED', // Eden disabled background
    borderRadius: 99, // Full radius for pill shape
    borderWidth: 1,
    borderColor: '#E0E0DC', // Eden border color
    alignSelf: 'flex-start',
  },
  courseTypeText: {
    color: '#4A5E50', // Eden secondary text color
    fontSize: 12,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  priceLevel: {
    fontSize: 16,
    color: '#4A5E50', // Eden secondary text color
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 