import React, { useEffect, useState, useRef } from 'react';
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
import { useCallback } from 'react';

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
  const { wantToPlayCourses: globalWantToPlayCourses, setNeedsRefresh } = usePlayedCourses();
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  
  // Match the PlayedCoursesList pattern with internal state
  const [internalCourses, setInternalCourses] = useState<Course[]>(
    courses && courses.length > 0 ? courses : 
    globalWantToPlayCourses && globalWantToPlayCourses.length > 0 ? globalWantToPlayCourses : 
    []
  );

  // Throttle updates like the PlayedCoursesList does
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE_MS = 300;
  
  // Add component lifecycle logging
  useEffect(() => {
    setTimeout(() => {
      console.log('📌 WantToPlayCoursesList Mounted');
    }, 0);
    
    return () => {
      setTimeout(() => {
        console.log('📌 WantToPlayCoursesList Unmounted');
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
    
    // Only log course count to reduce log overhead
    const courseCount = courses?.length || 0;
    console.log(`WantToPlayCoursesList updating with ${courseCount} courses from props`);
    
    // Only update if we receive valid, non-empty data
    if (courses && Array.isArray(courses) && courses.length > 0) {
      lastUpdateRef.current = now;
      setInternalCourses(courses);
    } else if (globalWantToPlayCourses && globalWantToPlayCourses.length > 0) {
      // Check if we have data in the global context
      lastUpdateRef.current = now;
      setInternalCourses(globalWantToPlayCourses);
      console.log(`WantToPlayCoursesList falling back to ${globalWantToPlayCourses.length} global courses`);
    }
    // If both are empty, preserve existing internal data
  }, [courses, globalWantToPlayCourses]);
  
  // Function to remove a course from bookmarks
  const removeBookmark = async (courseId: string) => {
    if (!user) return;
    
    setRemovingId(courseId);
    
    try {
      const { error } = await supabase
        .from('want_to_play_courses')
        .delete()
        .match({ 
          user_id: user.id, 
          course_id: courseId
        });

      if (error) {
        console.error('Error removing bookmark:', error);
        throw error;
      }

      console.log(`Successfully removed bookmark for course ${courseId}`);
      
      // Update internal state immediately
      setInternalCourses(prev => prev.filter(course => course.id !== courseId));
      
      // Trigger global refresh
      setNeedsRefresh();
    } catch (error) {
      console.error('Error in removeBookmark:', error);
    } finally {
      setRemovingId(null);
    }
  };
  
  // If there are no courses to display
  if (internalCourses.length === 0) {
    console.log('WantToPlayCoursesList - No courses to display, showing empty state');
    return (
      <EmptyTabState
        message="You haven't bookmarked any courses yet. Bookmark courses from the search page."
        icon="Bookmark"
      />
    );
  }
  
  console.log(`WantToPlayCoursesList rendering ${internalCourses.length} courses`);
  
  // Render the courses list using Eden design system
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm }}>
        <SmallText color={theme.colors.textSecondary}>
          {internalCourses.length} Bookmarked {internalCourses.length === 1 ? 'Course' : 'Courses'}
        </SmallText>
      </View>
      
      <FlatList
        data={internalCourses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            width: '100%',
          }}>
            <TouchableOpacity
              style={{ flex: 1, paddingRight: theme.spacing.xs }}
              onPress={() => handleCoursePress(item)}
              activeOpacity={0.7}
            >
              <BodyText 
                style={{ 
                  fontSize: 17, 
                  fontWeight: '600', 
                  marginBottom: 4, 
                  color: theme.colors.text 
                }} 
                numberOfLines={1}
              >
                {item.name}
              </BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={14} color={theme.colors.textSecondary} />
                <SmallText 
                  style={{ marginLeft: 4, color: theme.colors.textSecondary }} 
                  numberOfLines={1}
                >
                  {item.location || 'No location data'}
                </SmallText>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ padding: theme.spacing.sm, marginLeft: theme.spacing.xs }}
              onPress={() => removeBookmark(item.id)}
              disabled={removingId === item.id}
            >
              {removingId === item.id ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <X size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}); 