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
    setTimeout(() => {
      console.log('📌 PlayedCoursesList Mounted');
    }, 0);
    
    return () => {
      setTimeout(() => {
        console.log('📌 PlayedCoursesList Unmounted');
      }, 0);
    };
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

  // Helper function to display price level
  const getPriceLevel = useCallback((level: number) => {
    return '$'.repeat(Math.min(level, 5));
  }, []);
  
  // Helper function to get score color
  const getScoreColor = useCallback((score: number) => {
    if (score >= 7.0) return theme.colors.success; // Green for good scores (7.0-10.0)
    if (score >= 3.0) return theme.colors.warning; // Yellow for average scores (3.0-6.9)
    return theme.colors.error; // Red for poor scores (0.0-2.9)
  }, [theme]);

  // IMPORTANT: Memoize coursesToRender calculation but initialize with valid data
  const coursesToRender = useMemo(() => {
    // Immediately use whatever data is available (props > internal state > context)
    return (courses && courses.length > 0) ? courses : 
      (internalCourses && internalCourses.length > 0) ? internalCourses :
      (globalPlayedCourses && globalPlayedCourses.length > 0) ? globalPlayedCourses : [];
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

  // Render empty state
  if (coursesToRender.length === 0) {
    return (
      <EmptyTabState
        message="You haven't played any courses yet. Start by searching for a course to review."
        icon="Golf"
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          padding: theme.spacing.md,
          paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Extra padding for tab bar
        }}
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