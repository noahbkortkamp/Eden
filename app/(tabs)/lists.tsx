import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { CourseListTabs } from '../components/CourseListTabs';
import { Course } from '../types/review';
import { supabase } from '../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import { rankingService } from '../services/rankingService';
import { useAuth } from '../context/AuthContext';
import { courseListService } from '../services/courseListService';

export default function ListsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playedCourses, setPlayedCourses] = useState<Course[]>([]);
  const [wantToPlayCourses, setWantToPlayCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Add random key to force refresh when coming back to this tab
  // This will ensure the TabView resets properly
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Initial data load when component mounts
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [user]);
  
  // Better focus handling using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      console.log('Lists tab is now focused');
      // Force component to remount by changing the key
      setRefreshKey(Date.now());
      
      // Reload data when tab becomes focused to ensure latest reviews are shown
      if (user) {
        loadData();
      }
      
      return () => {
        // Clean up any resources if needed when tab loses focus
        console.log('Lists tab lost focus');
      };
    }, [user])
  );
  
  // Centralized data loading function
  const loadData = async () => {
    setLoading(true);
    setError(null);
    console.log('Loading all data for Lists screen');
    
    try {
      await Promise.all([
        fetchPlayedCourses(),
        fetchWantToPlayCourses(),
        fetchRecommendedCourses(),
      ]);
    } catch (error) {
      console.error('Error loading Lists data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayedCourses = async () => {
    try {
      console.log('🔍 Fetching reviewed courses for user:', user?.id);
      
      // DIRECT QUERY: Get courses the user has reviewed
      // This uses a more explicit query that avoids potential JSON parsing issues
      const { data, error: queryError } = await supabase
        .from('reviews')
        .select(`
          id,
          course_id,
          courses (
            id,
            name,
            location,
            type,
            price_level,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id || '');
      
      if (queryError) {
        console.error('🔍 Error fetching reviews with courses:', queryError);
        setError(`Error fetching your played courses: ${queryError.message}`);
        setPlayedCourses([]);
        return;
      }
      
      console.log('🔍 Query returned', data?.length || 0, 'results');
      console.log('🔍 Data structure:', JSON.stringify(data));
      
      if (!data || data.length === 0) {
        console.log('🔍 No reviewed courses found for user');
        setPlayedCourses([]);
        return;
      }
      
      // Extract and format course data
      const formattedCourses = data
        .filter(item => item.courses) // Only include items with course data
        .map(item => {
          // Map directly to Course type, with empty description since it doesn't exist
          return {
            id: item.course_id,
            name: item.courses.name,
            location: item.courses.location,
            type: item.courses.type,
            price_level: item.courses.price_level,
            description: "", // Set an empty description since that field doesn't exist
            created_at: item.courses.created_at,
            updated_at: item.courses.updated_at,
            rating: 0 // Default rating
          };
        });
        
      console.log('🔍 Formatted courses:', formattedCourses.map(c => c.name));
        
      if (formattedCourses.length === 0) {
        console.log('🔍 No valid course data found in reviews');
        setPlayedCourses([]);
        return;
      }
      
      // Get rankings for sorting
      try {
        const [likedRankings, fineRankings, didntLikeRankings] = await Promise.all([
          rankingService.getUserRankings(user?.id || '', 'liked'),
          rankingService.getUserRankings(user?.id || '', 'fine'),
          rankingService.getUserRankings(user?.id || '', 'didnt_like'),
        ]);
        
        // Combine all rankings
        const allRankings = [...likedRankings, ...fineRankings, ...didntLikeRankings];
        console.log('🔍 Found', allRankings.length, 'rankings for sorting');
        
        // Add rankings to the courses (for sorting)
        const rankedCourses = formattedCourses.map(course => {
          const ranking = allRankings.find(r => r.course_id === course.id);
          return {
            ...course,
            rating: ranking?.score || 0,
          };
        });
        
        // Sort by rating
        const sortedCourses = rankedCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        console.log('🔍 Final sorted course list:', sortedCourses.map(c => c.name));
        
        // Success - set the played courses
        setPlayedCourses(sortedCourses);
      } catch (rankingError) {
        console.error('🔍 Error fetching rankings, using unranked courses:', rankingError);
        setPlayedCourses(formattedCourses);
      }
    } catch (error) {
      console.error('🔍 Error in fetchPlayedCourses:', error);
      setPlayedCourses([]);
    }
  };

  const fetchWantToPlayCourses = async () => {
    try {
      // Since the want_to_play table doesn't exist yet, return empty array
      const testQuery = await supabase
        .from('want_to_play')
        .select('course_id')
        .limit(1);
        
      // If the table exists, proceed with real data
      if (!testQuery.error) {
        // First get want_to_play entries for the user
        const { data: wantToPlay, error: wantToPlayError } = await supabase
          .from('want_to_play')
          .select('course_id')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (wantToPlayError) throw wantToPlayError;
        
        // If no 'want to play' courses, return empty array
        if (!wantToPlay || wantToPlay.length === 0) {
          setWantToPlayCourses([]);
          return;
        }
        
        // Extract course IDs
        const courseIds = wantToPlay.map(item => item.course_id);
        
        // Then fetch the actual course details
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, name, location, type, price_level')
          .in('id', courseIds);

        if (coursesError) throw coursesError;

        setWantToPlayCourses(courses || []);
      } else {
        // The table doesn't exist, return empty array
        console.log('Want to play table does not exist yet, returning empty array');
        setWantToPlayCourses([]);
      }
    } catch (error) {
      console.error('Error fetching want to play courses:', error);
      setWantToPlayCourses([]);
    }
  };

  const fetchRecommendedCourses = async () => {
    try {
      // Get user's liked courses
      const likedRankings = await rankingService.getUserRankings(user?.id || '', 'liked');
      
      // If user has no liked courses, we can't make recommendations
      if (likedRankings.length === 0) {
        setRecommendedCourses([]);
        return;
      }
      
      // Try to get recommendations using course tags
      try {
        // Get similar courses based on tags from user's top-rated courses
        const topCourseIds = likedRankings
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(r => r.course_id);
          
        // First get tags from top courses
        const { data: courseTags, error: tagsError } = await supabase
          .from('course_tags')
          .select('tag_id')
          .in('course_id', topCourseIds);
          
        if (tagsError) {
          console.log('Course tags table does not exist yet, returning empty array');
          setRecommendedCourses([]);
          return;
        }
        
        // If no tags found, return empty array
        if (!courseTags || courseTags.length === 0) {
          console.log('No course tags found, returning empty array');
          setRecommendedCourses([]);
          return;
        }
        
        // Extract unique tag IDs
        const tagIds = [...new Set(courseTags.map(t => t.tag_id))];
        
        // Then get courses with those tags
        const { data: similarCourses, error } = await supabase
          .from('courses')
          .select(`
            *,
            course_tags!inner (
              tag_id
            )
          `)
          .in('course_tags.tag_id', tagIds)
          .not('id', 'in', likedRankings.map(r => r.course_id)) // Exclude already rated courses
          .limit(10);

        if (error) throw error;

        setRecommendedCourses(similarCourses || []);
      } catch (tagsError) {
        console.log('Error fetching course tags:', tagsError);
        setRecommendedCourses([]);
      }
    } catch (error) {
      console.error('Error fetching recommended courses:', error);
      setRecommendedCourses([]);
    }
  };

  const handleCoursePress = (course: Course) => {
    router.push(`/course/${course.id}`);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingBottom: 0, // Remove any bottom padding
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      padding: 20,
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: 20,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadData}>
          <Text style={{ color: theme.colors.primary }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debug output to verify data before rendering
  console.log('📊 Rendering Lists screen with:', {
    playedCount: playedCourses?.length || 0,
    wantToPlayCount: wantToPlayCourses?.length || 0,
    recommendedCount: recommendedCourses?.length || 0,
    playedNames: playedCourses?.map(c => c.name) || []
  });

  return (
    <View style={styles.container}>
      <CourseListTabs
        key={refreshKey}
        playedCourses={playedCourses}
        wantToPlayCourses={wantToPlayCourses}
        recommendedCourses={recommendedCourses}
        onCoursePress={handleCoursePress}
      />
    </View>
  );
} 