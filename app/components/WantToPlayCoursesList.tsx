import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Course } from '../types/review';
import { useEdenTheme } from '../theme/ThemeProvider';
import { MapPin, X } from 'lucide-react-native';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Heading3, BodyText, SmallText } from './eden/Typography';
import { Button } from './eden/Button';
import { EmptyTabState } from './eden/Tabs';
import { Icon } from './eden/Icon';

interface WantToPlayCoursesListProps {
  courses: Course[];
  handleCoursePress: (course: Course) => void;
  showScores?: boolean;
}

export const WantToPlayCoursesList = React.memo(({ 
  courses, 
  handleCoursePress, 
  showScores = false
}: WantToPlayCoursesListProps) => {
  const theme = useEdenTheme();
  const { user } = useAuth();
  
  // Phase 2: Use context dataFingerprint for efficient change detection
  const { wantToPlayCourses: globalWantToPlayCourses, setNeedsRefresh, dataFingerprint } = usePlayedCourses();
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  
  // Phase 2: Simplified internal state management
  const [internalCourses, setInternalCourses] = useState<Course[]>(
    courses && courses.length > 0 ? courses : 
    globalWantToPlayCourses && globalWantToPlayCourses.length > 0 ? globalWantToPlayCourses : 
    []
  );

  // Phase 2: Remove unnecessary throttling since context now has fingerprint-based updates
  
  // Add component lifecycle logging
  useEffect(() => {
    console.log('📌 WantToPlayCoursesList Mounted');
    
    return () => {
      console.log('📌 WantToPlayCoursesList Unmounted');
    };
  }, []);
  
  // Phase 2: Optimized state update logic using context fingerprint
  useEffect(() => {
    if (courses && Array.isArray(courses) && courses.length > 0) {
      setInternalCourses(courses);
    } else if (globalWantToPlayCourses && globalWantToPlayCourses.length > 0) {
      setInternalCourses(globalWantToPlayCourses);
    }
    // If both are empty, preserve existing internal data
  }, [courses, dataFingerprint]); // Use dataFingerprint instead of globalWantToPlayCourses directly

  // Phase 2: Enhanced memoized coursesToRender calculation
  const coursesToRender = useMemo(() => {
    const result = (courses && courses.length > 0) ? courses : 
      (internalCourses && internalCourses.length > 0) ? internalCourses :
      (globalWantToPlayCourses && globalWantToPlayCourses.length > 0) ? globalWantToPlayCourses : [];
    
    // Add validation to ensure data quality
    return result.filter(course => course && course.id && course.name);
  }, [courses, internalCourses, globalWantToPlayCourses]);

  // Phase 2: Memoized remove course function
  const removeCourse = useCallback(async (courseId: string) => {
    if (!user) return;
    
    setRemovingId(courseId);
    
    try {
      const { error } = await supabase
        .from('want_to_play_courses')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
        
      if (error) {
        console.error('Error removing course from want to play list:', error);
        // You could show a toast notification here
      } else {
        // Optimistically update the UI
        setInternalCourses(prev => prev.filter(course => course.id !== courseId));
        // Trigger a refresh of the lists
        setNeedsRefresh();
      }
    } catch (error) {
      console.error('Error removing course:', error);
    } finally {
      setRemovingId(null);
    }
  }, [user, setNeedsRefresh]);

  // Phase 2: Memoized empty state component
  const emptyState = useMemo(() => (
    <EmptyTabState
      message="No courses in your want to play list yet. Search for courses and add them to this list."
      icon="BookOpen"
    />
  ), []);

  // Phase 2: Memoized container style
  const containerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  }), [theme.colors.background, theme.spacing.md]);

  // Phase 2: Memoized renderCourse function for FlatList performance
  const renderCourse = useCallback(({ item: course }: { item: Course }) => (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm, // Reduced from md to sm for smaller boxes
      marginBottom: theme.spacing.sm, // Reduced from md to sm for tighter spacing
      borderWidth: 1,
      borderColor: theme.colors.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          onPress={() => handleCoursePress(course)}
        >
          <Heading3 numberOfLines={2} style={{ marginBottom: theme.spacing.xs, paddingRight: theme.spacing.sm }}>
            {course.name}
          </Heading3>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <SmallText 
              style={{ marginLeft: theme.spacing.sm, color: theme.colors.textSecondary, flex: 1 }} 
              numberOfLines={2}
            >
              {course.location || 'Unknown location'}
            </SmallText>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => removeCourse(course.id)}
          disabled={removingId === course.id}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.full,
            backgroundColor: removingId === course.id ? theme.colors.backgroundSecondary : 'transparent',
          }}
        >
          {removingId === course.id ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : (
            <X size={20} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  ), [theme, handleCoursePress, removeCourse, removingId]);

  // Phase 2: Memoized keyExtractor for FlatList performance
  const keyExtractor = useCallback((item: Course) => item.id, []);

  if (coursesToRender.length === 0) {
    return emptyState;
  }

  return (
    <View style={containerStyle}>
      <FlatList
        data={coursesToRender}
        renderItem={renderCourse}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={true} // Phase 2: Add performance optimization for long lists
        maxToRenderPerBatch={10} // Phase 2: Optimize rendering batch size
        windowSize={10} // Phase 2: Optimize memory usage
      />
    </View>
  );
}); 