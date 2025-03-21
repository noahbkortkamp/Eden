import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Course } from '../types/review';
import { useTheme } from '../theme/ThemeProvider';
import { MapPin, BookmarkIcon, X } from 'lucide-react-native';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface WantToPlayCoursesListProps {
  courses: Course[];
  onCoursePress: (course: Course) => void;
  reviewCount?: number;
}

export const WantToPlayCoursesList = React.memo(({ 
  courses, 
  onCoursePress, 
  reviewCount = 0 
}: WantToPlayCoursesListProps) => {
  const theme = useTheme();
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
    console.log('📌 WantToPlayCoursesList Mounted');
    return () => console.log('📌 WantToPlayCoursesList Unmounted');
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
  
  // Empty state component
  const EmptyStateView = () => (
    <View style={styles.emptyStateContainer}>
      <BookmarkIcon size={80} color={theme.colors.textSecondary} style={{opacity: 0.8}} />
      <Text style={styles.emptyStateText}>
        No bookmarked courses yet
      </Text>
      <Text style={styles.emptyStateSubText}>
        Bookmark courses from the search page
      </Text>
    </View>
  );
  
  // If there are no courses to display
  if (internalCourses.length === 0) {
    console.log('WantToPlayCoursesList - No courses to display, showing empty state');
    return <EmptyStateView />;
  }
  
  console.log(`WantToPlayCoursesList rendering ${internalCourses.length} courses`);
  
  // Render the courses list - simplified structure
  return (
    <View style={styles.container}>
      <FlatList
        data={internalCourses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.courseRow}>
            <TouchableOpacity
              style={styles.courseContent}
              onPress={() => onCoursePress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.courseName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.locationContainer}>
                <MapPin size={14} color={theme.colors.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location || 'No location data'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removeButton}
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
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={() => (
          <Text style={styles.listHeader}>
            {internalCourses.length} Bookmarked {internalCourses.length === 1 ? 'Course' : 'Courses'}
          </Text>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
    color: '#666',
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    width: '100%',
  },
  courseContent: {
    flex: 1,
    paddingRight: 8,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#666',
  },
  removeButton: {
    padding: 10,
    marginLeft: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  emptyStateSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    color: '#666',
  }
}); 