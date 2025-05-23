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
      
      // Create a set of course IDs with rankings for easy lookup
      const rankedCourseIds = new Set(allRankings.map(r => r.course_id));

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
      
      // Get all user's reviews to find any that don't have rankings yet (like first-time reviews)
      const { data: userReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('course_id, rating, date_played')
        .eq('user_id', user?.id || '');
        
      if (reviewsError) throw reviewsError;
      
      // Find reviews without rankings
      const reviewsWithoutRankings = userReviews?.filter(review => 
        !rankedCourseIds.has(review.course_id)
      ) || [];
      
      // If there are reviews without rankings (e.g., first review), add them to the played courses
      if (reviewsWithoutRankings.length > 0) {
        console.log(`Found ${reviewsWithoutRankings.length} reviews without rankings`);
        
        // Get course details for unranked reviews
        const unrankedCourseIds = reviewsWithoutRankings.map(r => r.course_id);
        
        const { data: unrankedCourses, error: unrankedError } = await supabase
          .from('courses')
          .select('*')
          .in('id', unrankedCourseIds);
          
        if (!unrankedError && unrankedCourses) {
          // Add these courses to the list with a default rating
          const additionalCourses = unrankedCourses.map(course => {
            const review = reviewsWithoutRankings.find(r => r.course_id === course.id);
            return {
              ...course,
              rating: 5.0, // Default rating since rankings aren't generated yet
              date_played: review?.date_played
            };
          });
          
          // Add the unranked courses to our list
          rankedCourses.push(...additionalCourses);
        }
      }

      // Sort by score descending
      setPlayedCourses(rankedCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0)));
    } catch (error) {
      console.error('Error fetching played courses:', error);
    }
  };

  const fetchWantToPlayCourses = async () => {
    try {
      // DEVELOPMENT MODE: Since the want_to_play table doesn't exist yet,
      // we'll use mock data instead of trying to query a non-existent table
      
      // Check if we're in development by testing a simple query to the non-existent table
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
        // The table doesn't exist, so use mock data instead
        console.log('Using mock data for want to play courses (table does not exist yet)');
        
        // Get a few random courses from the courses table as mock "want to play" data
        const { data: mockCourses, error: mockError } = await supabase
          .from('courses')
          .select('id, name, location, type, price_level')
          .limit(3);
          
        if (mockError) {
          // If even this fails, just use hardcoded mock data
          const hardcodedMockCourses = [
            {
              id: 'mock-1',
              name: 'Pine Valley Golf Club',
              location: 'Pine Valley, NJ',
              type: 'Championship',
              price_level: '$$$$'
            },
            {
              id: 'mock-2',
              name: 'Augusta National',
              location: 'Augusta, GA',
              type: 'Championship',
              price_level: '$$$$'
            }
          ];
          setWantToPlayCourses(hardcodedMockCourses);
        } else {
          setWantToPlayCourses(mockCourses || []);
        }
      }
    } catch (error) {
      console.error('Error fetching want to play courses:', error);
      
      // Provide fallback mock data even on error
      const fallbackCourses = [
        {
          id: 'fallback-1',
          name: 'Pebble Beach Golf Links',
          location: 'Pebble Beach, CA',
          type: 'Links',
          price_level: '$$$$'
        }
      ];
      setWantToPlayCourses(fallbackCourses);
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
        
      if (tagsError) throw tagsError;
      
      // If no tags found, return empty array
      if (!courseTags || courseTags.length === 0) {
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