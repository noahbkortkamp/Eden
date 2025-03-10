import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { CourseListTabs } from '../components/CourseListTabs';
import { Course } from '../types/review';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import { rankingService } from '../services/rankingService';
import { useAuth } from '../context/AuthContext';

export default function ListsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playedCourses, setPlayedCourses] = useState<Course[]>([]);
  const [wantToPlayCourses, setWantToPlayCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    Promise.all([
      fetchPlayedCourses(),
      fetchWantToPlayCourses(),
      fetchRecommendedCourses(),
    ]).finally(() => setLoading(false));
  }, [user]);

  const fetchPlayedCourses = async () => {
    try {
      // Get user's rankings for all sentiment categories
      const [likedRankings, fineRankings, didntLikeRankings] = await Promise.all([
        rankingService.getUserRankings(user?.id || '', 'liked'),
        rankingService.getUserRankings(user?.id || '', 'fine'),
        rankingService.getUserRankings(user?.id || '', 'didnt_like'),
      ]);

      // Combine all rankings
      const allRankings = [...likedRankings, ...fineRankings, ...didntLikeRankings];

      // Fetch course details for all ranked courses
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .in('id', allRankings.map(r => r.course_id));

      if (error) throw error;

      // Combine course details with their rankings
      const rankedCourses = courses?.map(course => {
        const ranking = allRankings.find(r => r.course_id === course.id);
        return {
          ...course,
          rating: ranking?.score || 0,
        };
      }) || [];

      // Sort by score descending
      setPlayedCourses(rankedCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0)));
    } catch (error) {
      console.error('Error fetching played courses:', error);
    }
  };

  const fetchWantToPlayCourses = async () => {
    try {
      const { data: courses, error } = await supabase
        .from('want_to_play')
        .select(`
          course:courses (
            id,
            name,
            location,
            type,
            price_level
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWantToPlayCourses(courses?.map(item => item.course) || []);
    } catch (error) {
      console.error('Error fetching want to play courses:', error);
    }
  };

  const fetchRecommendedCourses = async () => {
    try {
      // Get user's liked courses
      const likedRankings = await rankingService.getUserRankings(user?.id || '', 'liked');
      
      // Get similar courses based on tags from user's top-rated courses
      const topCourseIds = likedRankings
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(r => r.course_id);

      const { data: similarCourses, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_tags!inner (
            tag_id
          )
        `)
        .in(
          'course_tags.tag_id',
          // Subquery to get tags from user's top-rated courses
          supabase
            .from('course_tags')
            .select('tag_id')
            .in('course_id', topCourseIds)
        )
        .not('id', 'in', likedRankings.map(r => r.course_id)) // Exclude already rated courses
        .limit(10);

      if (error) throw error;

      setRecommendedCourses(similarCourses || []);
    } catch (error) {
      console.error('Error fetching recommended courses:', error);
    }
  };

  const handleCoursePress = (course: Course) => {
    router.push(`/course/${course.id}`);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CourseListTabs
        playedCourses={playedCourses}
        wantToPlayCourses={wantToPlayCourses}
        recommendedCourses={recommendedCourses}
        onCoursePress={handleCoursePress}
      />
    </View>
  );
} 