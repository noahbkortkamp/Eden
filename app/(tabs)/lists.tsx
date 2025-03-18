import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { CourseListTabs } from '../components/CourseListTabs';
import { Course } from '../types/review';
import { supabase } from '../utils/supabase';
import { router, useFocusEffect } from 'expo-router';
import { rankingService } from '../services/rankingService';
import { useAuth } from '../context/AuthContext';
import { courseListService } from '../services/courseListService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { reviewService } from '../services/reviewService';
import { PlayedCoursesList } from '../components/PlayedCoursesList';

export default function ListsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [courseType, setCourseType] = useState<'played' | 'recommended' | 'want-to-play'>('played');
  const [loading, setLoading] = useState(true);
  const { 
    playedCourses, setPlayedCourses,
    wantToPlayCourses, setWantToPlayCourses,
    recommendedCourses, setRecommendedCourses,
    isCoursesLoading, setCoursesLoading,
    hasLoadedCourses, setHasLoadedCourses,
    lastUpdateTimestamp,
    setNeedsRefresh
  } = usePlayedCourses();
  
  const [error, setError] = useState<string | null>(null);
  
  // Add random key to force refresh when coming back to this tab
  // This will ensure the TabView resets properly
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Add a new state to track when we're using test data
  const [usingTestData, setUsingTestData] = useState(false);
  
  // Add a state to control the visibility of the debug panel
  const [showDebugPanel, setShowDebugPanel] = useState(true);

  // Track the last time we refreshed to prevent too many reloads
  const lastRefreshTime = useRef(0);
  // Minimum time between refreshes (2 seconds)
  const REFRESH_THROTTLE_MS = 2000;

  const [userReviewCount, setUserReviewCount] = useState(0);

  // Load user review count on initial render
  useEffect(() => {
    async function loadUserReviewCount() {
      if (user) {
        try {
          const count = await reviewService.getUserReviewCount(user.id);
          console.log(`🔢 User has ${count} reviews. Score visibility: ${count >= 10 ? 'ENABLED' : 'DISABLED'}`);
          setUserReviewCount(count);
        } catch (err) {
          console.error('Error fetching user review count:', err);
        }
      }
    }
    
    loadUserReviewCount();
  }, [user]);

  // Add lifecycle logging to track component mounting and unmounting
  useEffect(() => {
    console.log('📌 ListsScreen Mounted');
    return () => console.log('📌 ListsScreen Unmounted');
  }, []);

  // Initial data load when component mounts
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Only load data if we haven't loaded it before or if explicitly requested
    if (!hasLoadedCourses && !isCoursesLoading) {
      console.log('📌 ListsScreen: Initial data load');
      loadData();
    } else {
      console.log('📌 ListsScreen: Skipping initial load - data already loaded:', 
        { hasLoadedCourses, playedCount: playedCourses.length });
      setLoading(false);
    }
  }, [user, hasLoadedCourses, isCoursesLoading]);

  // Modified useFocusEffect to check for updated timestamp with debouncing
  useFocusEffect(
    useCallback(() => {
      console.log('Lists tab is now focused, usingTestData:', usingTestData);
      
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime.current;
      
      // Prevent refreshing too frequently
      if (timeSinceLastRefresh < REFRESH_THROTTLE_MS) {
        console.log(`THROTTLING: Refresh attempted too soon (${timeSinceLastRefresh}ms since last refresh)`);
        return;
      }
      
      // Only reload if:
      // 1. Not using test data AND
      // 2. Either:
      //    a. No courses loaded yet OR
      //    b. The data has been marked for refresh
      if (!usingTestData && (!hasLoadedCourses || !isCoursesLoading)) {
        console.log('Triggering data reload on focus');
        lastRefreshTime.current = now;
        loadData();
      } else {
        console.log('SKIPPING automatic data reload since we',
          usingTestData ? 'ARE using test data' : 
            (hasLoadedCourses ? 'already loaded courses' : 'are currently loading or have courses'));
      }
      
      return () => {
        console.log('Lists tab lost focus');
      };
    }, [usingTestData, hasLoadedCourses, isCoursesLoading, lastUpdateTimestamp])
  );

  // Centralized data loading function
  const loadData = async () => {
    setLoading(true);
    setCoursesLoading(true); // Update context loading state
    setError(null);
    console.log('Loading all data for Lists screen');
    
    try {
      // Try a completely fresh approach to diagnose database issues
      console.log('🔎 DIAGNOSTIC: Trying direct table access...');
      
      // 1. Directly check reviews table
      const { data: allReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*');
        
      console.log('🔎 DIAGNOSTIC: Direct reviews table access:', {
        success: !reviewsError,
        error: reviewsError?.message,
        totalReviewCount: allReviews?.length || 0,
        tableExists: !reviewsError && Array.isArray(allReviews)
      });
      
      // 2. Directly check courses table
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .limit(5);
        
      console.log('🔎 DIAGNOSTIC: Direct courses table access:', {
        success: !coursesError,
        error: coursesError?.message,
        sampleCount: allCourses?.length || 0,
        tableExists: !coursesError && Array.isArray(allCourses),
        sampleNames: allCourses?.map(c => c.name)
      });
      
      // Now proceed with the regular data loading
      await Promise.all([
        fetchPlayedCourses(),
        fetchWantToPlayCourses(),
        fetchRecommendedCourses(),
      ]);
      
      // Mark courses as loaded
      setHasLoadedCourses(true);
    } catch (error) {
      console.error('Error loading Lists data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setCoursesLoading(false); // Update context loading state
    }
  };

  const fetchPlayedCourses = async () => {
    try {
      console.log('🔍 DEBUG: Starting fetchPlayedCourses');
      console.log('🔍 DEBUG: User ID:', user?.id);
      
      // TEST: Check if courses table is accessible directly
      console.log('🔍 DEBUG: Testing direct access to courses table...');
      const { data: coursesCheck, error: coursesCheckError } = await supabase
        .from('courses')
        .select('*')
        .limit(3);
        
      console.log('🔍 DEBUG: Courses table check:', { 
        hasError: !!coursesCheckError,
        errorMessage: coursesCheckError?.message,
        courseCount: coursesCheck?.length || 0,
        sampleCourses: coursesCheck?.map(c => ({
          id: c.id,
          name: c.name
        }))
      });
      
      // First check if we can query the reviews table directly
      console.log('🔍 DEBUG: Querying reviews table directly...');
      const { data: reviewCheck, error: reviewCheckError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user?.id || '');
        
      console.log('🔍 DEBUG: Raw reviews check:', { 
        hasError: !!reviewCheckError,
        errorDetails: reviewCheckError?.message,
        reviewCount: reviewCheck?.length || 0,
        reviews: reviewCheck?.map(r => ({
          id: r.id,
          course_id: r.course_id,
          rating: r.rating,
          date_played: r.date_played,
          user_id: r.user_id // Add user_id to verify it's filtering correctly
        }))
      });

      if (reviewCheckError) {
        console.error('🔍 ERROR: Failed to query reviews directly:', reviewCheckError.message);
        throw new Error(`Failed to query reviews: ${reviewCheckError.message}`);
      }

      // Check course_id values from reviews
      if (reviewCheck && reviewCheck.length > 0) {
        const courseIds = reviewCheck.map(r => r.course_id);
        console.log('🔍 DEBUG: Looking up course IDs from reviews:', courseIds);
        
        // Verify these course IDs exist in the courses table
        const { data: courseVerify, error: courseVerifyError } = await supabase
          .from('courses')
          .select('id, name')
          .in('id', courseIds);
          
        console.log('🔍 DEBUG: Course verification:', {
          hasError: !!courseVerifyError,
          errorMessage: courseVerifyError?.message,
          foundCount: courseVerify?.length || 0,
          expectedCount: courseIds.length,
          foundCourses: courseVerify?.map(c => ({
            id: c.id,
            name: c.name
          }))
        });
        
        // Compare found vs expected
        if (courseVerify && courseIds.length !== courseVerify.length) {
          console.log('🔍 DEBUG: ⚠️ Missing courses detected - not all review course_ids match courses in database');
          
          // Find which course IDs are missing
          const foundIds = new Set(courseVerify.map(c => c.id));
          const missingIds = courseIds.filter(id => !foundIds.has(id));
          console.log('🔍 DEBUG: Missing course IDs:', missingIds);
        }
      }
      
      // DIRECT QUERY: Get courses the user has reviewed with proper join
      console.log('🔍 DEBUG: Executing main join query...');
      const { data, error: queryError } = await supabase
        .from('reviews')
        .select(`
          id,
          course_id,
          rating,
          date_played,
          courses:courses!inner (
            id,
            name,
            location,
            type,
            price_level,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id || '')
        .order('date_played', { ascending: false });
        
      console.log('🔍 DEBUG: Main query result:', {
        hasError: !!queryError,
        errorMessage: queryError?.message,
        dataLength: data?.length || 0,
        data: data?.map(d => ({
          id: d.id,
          course_id: d.course_id,
          rating: d.rating,
          courseName: d.courses?.name,
          date_played: d.date_played,
          hasCourseData: !!d.courses
        }))
      });
      
      if (queryError) {
        console.error('🔍 ERROR: Error fetching reviews with courses:', queryError.message);
        
        // FALLBACK: If inner join fails, try two separate queries
        console.log('🔍 DEBUG: Inner join failed, attempting fallback query approach...');
        
        // 1. Get reviews for user
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user?.id || '')
          .order('date_played', { ascending: false });
          
        if (reviewsError || !reviewsData || reviewsData.length === 0) {
          console.error('🔍 ERROR: Fallback reviews query failed:', reviewsError?.message);
          throw new Error(`Fallback reviews query failed: ${reviewsError?.message || 'No data returned'}`);
        }
        
        console.log('🔍 DEBUG: Fallback reviews query successful, found', reviewsData.length, 'reviews');
        
        // 2. Extract course IDs and fetch those courses
        const courseIds = reviewsData.map(r => r.course_id);
        
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);
          
        if (coursesError || !coursesData || coursesData.length === 0) {
          console.error('🔍 ERROR: Fallback courses query failed:', coursesError?.message);
          throw new Error(`Fallback courses query failed: ${coursesError?.message || 'No courses found'}`);
        }
        
        console.log('🔍 DEBUG: Fallback courses query successful, found', coursesData.length, 'courses');
        
        // 3. Manually join the data
        const manuallyJoinedData = reviewsData.map(review => {
          const matchingCourse = coursesData.find(course => course.id === review.course_id);
          if (matchingCourse) {
            return {
              id: review.id,
              course_id: review.course_id,
              rating: review.rating,
              date_played: review.date_played,
              courses: matchingCourse
            };
          }
          return null;
        }).filter(item => item !== null);
        
        console.log('🔍 DEBUG: Manually joined data:', {
          count: manuallyJoinedData.length,
          expectedCount: reviewsData.length,
          sample: manuallyJoinedData.slice(0, 2).map(d => ({
            reviewId: d?.id,
            courseId: d?.course_id,
            courseName: d?.courses?.name
          }))
        });
        
        // Use this manually joined data instead
        if (manuallyJoinedData.length > 0) {
          // Process this data the same way we would the regular joined data
          // Extract and format course data
          const formattedCourses = manuallyJoinedData
            .filter(item => item && item.courses) // Only include items with course data
            .map(item => {
              if (!item) return null; // Extra safety check
              return {
                id: item.course_id,
                name: item.courses.name,
                location: item.courses.location,
                type: item.courses.type,
                price_level: item.courses.price_level,
                description: "", // Set an empty description since that field doesn't exist
                created_at: item.courses.created_at,
                updated_at: item.courses.updated_at,
                rating: 0, // Will be updated with ranking score
                sentiment: item.rating, // Store the original sentiment
                showScores: userReviewCount >= 10 // Add this flag to each course
              };
            })
            .filter(Boolean); // Remove any nulls
            
          console.log('🔍 DEBUG: Formatted courses from fallback:', {
            count: formattedCourses.length,
            courses: formattedCourses.map(c => ({ 
              id: c.id, 
              name: c.name,
              sentiment: c.sentiment,
              showScores: c.showScores
            }))
          });
          
          if (formattedCourses.length > 0) {
            // Continue with normal processing using formattedCourses
            // Group courses by sentiment
            const likedCourses = formattedCourses.filter(c => c.sentiment === 'liked');
            const fineCourses = formattedCourses.filter(c => c.sentiment === 'fine');
            const didntLikeCourses = formattedCourses.filter(c => c.sentiment === 'didnt_like');
            
            // Assign scores based on sentiment
            const scoredCourses = formattedCourses.map(course => {
              let score = 0;
              let scoreDetails = { sentiment: course.sentiment, reason: '' };
              
              if (course.sentiment === 'liked') {
                const position = likedCourses.findIndex(c => c.id === course.id);
                const total = likedCourses.length;
                
                // Handle case with only one liked course
                if (total === 1) {
                  score = 10.0;
                  scoreDetails.reason = 'only liked course - max score';
                } else {
                  // Ensure we don't divide by zero
                  score = position === 0 ? 10.0 : 7.0 + ((10.0 - 7.0) * (total - position - 1) / Math.max(total - 1, 1));
                  scoreDetails.reason = position === 0 ? 'top liked course' : `position ${position + 1} of ${total}`;
                }
              } else if (course.sentiment === 'fine') {
                const position = fineCourses.findIndex(c => c.id === course.id);
                const total = fineCourses.length;
                
                // Handle case with only one fine course
                if (total === 1) {
                  score = 6.9;
                  scoreDetails.reason = 'only fine course - max score';
                } else {
                  // Ensure we don't divide by zero
                  score = position === 0 ? 6.9 : 3.0 + ((6.9 - 3.0) * (total - position - 1) / Math.max(total - 1, 1));
                  scoreDetails.reason = position === 0 ? 'top fine course' : `position ${position + 1} of ${total}`;
                }
              } else if (course.sentiment === 'didnt_like') {
                const position = didntLikeCourses.findIndex(c => c.id === course.id);
                const total = didntLikeCourses.length;
                
                // Handle case with only one didnt_like course
                if (total === 1) {
                  score = 2.9;
                  scoreDetails.reason = 'only didnt_like course - max score';
                } else {
                  // Ensure we don't divide by zero
                  score = position === 0 ? 2.9 : 0.0 + ((2.9 - 0.0) * (total - position - 1) / Math.max(total - 1, 1));
                  scoreDetails.reason = position === 0 ? 'top didnt_like course' : `position ${position + 1} of ${total}`;
                }
              } else {
                scoreDetails.reason = 'unknown sentiment';
              }
              
              console.log(`🔍 DEBUG: Scoring ${course.name} (${course.sentiment}): ${score.toFixed(1)} - ${scoreDetails.reason}`);
              
              return {
                ...course,
                rating: Number(score.toFixed(1)),
                scoreDetails: scoreDetails, // Including scoring details for debugging
                showScores: userReviewCount >= 10 // Add this flag to each course
              };
            });
            
            // Sort by rating (highest to lowest)
            const sortedCourses = scoredCourses.sort((a, b) => b.rating - a.rating);
            
            console.log('🔍 Final sorted courses with scores (from fallback):', sortedCourses.map(c => ({ 
              name: c.name, 
              score: c.rating,
              sentiment: c.sentiment,
              reason: c.scoreDetails?.reason,
              showScores: c.showScores
            })));
            
            // Update the context state instead of local state
            setPlayedCourses(sortedCourses);
            return;
          }
        }
        
        throw new Error('Failed to process data with fallback approach');
      }
      
      // Check for complete absence of data
      if (!data) {
        console.log('🔍 DEBUG: No data returned from query (undefined)');
        setPlayedCourses([]);
        return;
      }
      
      // Check for empty array
      if (data.length === 0) {
        console.log('🔍 DEBUG: Empty array returned from query (length 0)');
        setPlayedCourses([]);
        return;
      }

      // Check for courses with null course data
      const nullCourseItems = data.filter(item => !item.courses);
      if (nullCourseItems.length > 0) {
        console.log('🔍 DEBUG: Found items with null course data:', nullCourseItems);
      }
      
      // Extract and format course data
      const formattedCourses = data
        .filter(item => item.courses) // Only include items with course data
        .map(item => {
          console.log('🔍 DEBUG: Processing review:', {
            reviewId: item.id,
            courseId: item.course_id,
            rating: item.rating,
            hasCoursesData: !!item.courses,
            courseName: item.courses?.name,
            date_played: item.date_played
          });
          return {
            id: item.course_id,
            name: item.courses.name,
            location: item.courses.location,
            type: item.courses.type,
            price_level: item.courses.price_level,
            description: "", // Set an empty description since that field doesn't exist
            created_at: item.courses.created_at,
            updated_at: item.courses.updated_at,
            rating: 0, // Will be updated with ranking score
            sentiment: item.rating, // Store the original sentiment
            showScores: userReviewCount >= 10 // Add this flag to each course
          };
        });
        
      console.log('🔍 DEBUG: Formatted courses:', {
        count: formattedCourses.length,
        courses: formattedCourses.map(c => ({ 
          id: c.id, 
          name: c.name,
          sentiment: c.sentiment,
          showScores: c.showScores
        }))
      });
        
      if (formattedCourses.length === 0) {
        console.log('🔍 ERROR: No valid course data found in reviews after filtering');
        setPlayedCourses([]);
        return;
      }

      // Group courses by sentiment
      const likedCourses = formattedCourses.filter(c => c.sentiment === 'liked');
      const fineCourses = formattedCourses.filter(c => c.sentiment === 'fine');
      const didntLikeCourses = formattedCourses.filter(c => c.sentiment === 'didnt_like');

      console.log('🔍 DEBUG: Grouped courses:', {
        liked: likedCourses.length,
        fine: fineCourses.length,
        didntLike: didntLikeCourses.length
      });

      // Assign scores based on sentiment
      const scoredCourses = formattedCourses.map(course => {
        let score = 0;
        let scoreDetails = { sentiment: course.sentiment, reason: '' };
        
        if (course.sentiment === 'liked') {
          const position = likedCourses.findIndex(c => c.id === course.id);
          const total = likedCourses.length;
          
          // Handle case with only one liked course
          if (total === 1) {
            score = 10.0;
            scoreDetails.reason = 'only liked course - max score';
          } else {
            // Ensure we don't divide by zero
            score = position === 0 ? 10.0 : 7.0 + ((10.0 - 7.0) * (total - position - 1) / Math.max(total - 1, 1));
            scoreDetails.reason = position === 0 ? 'top liked course' : `position ${position + 1} of ${total}`;
          }
        } else if (course.sentiment === 'fine') {
          const position = fineCourses.findIndex(c => c.id === course.id);
          const total = fineCourses.length;
          
          // Handle case with only one fine course
          if (total === 1) {
            score = 6.9;
            scoreDetails.reason = 'only fine course - max score';
          } else {
            // Ensure we don't divide by zero
            score = position === 0 ? 6.9 : 3.0 + ((6.9 - 3.0) * (total - position - 1) / Math.max(total - 1, 1));
            scoreDetails.reason = position === 0 ? 'top fine course' : `position ${position + 1} of ${total}`;
          }
        } else if (course.sentiment === 'didnt_like') {
          const position = didntLikeCourses.findIndex(c => c.id === course.id);
          const total = didntLikeCourses.length;
          
          // Handle case with only one didnt_like course
          if (total === 1) {
            score = 2.9;
            scoreDetails.reason = 'only didnt_like course - max score';
          } else {
            // Ensure we don't divide by zero
            score = position === 0 ? 2.9 : 0.0 + ((2.9 - 0.0) * (total - position - 1) / Math.max(total - 1, 1));
            scoreDetails.reason = position === 0 ? 'top didnt_like course' : `position ${position + 1} of ${total}`;
          }
        } else {
          scoreDetails.reason = 'unknown sentiment';
        }
        
        console.log(`🔍 DEBUG: Scoring ${course.name} (${course.sentiment}): ${score.toFixed(1)} - ${scoreDetails.reason}`);
        
        return {
          ...course,
          rating: Number(score.toFixed(1)),
          scoreDetails: scoreDetails, // Including scoring details for debugging
          showScores: userReviewCount >= 10 // Add this flag to each course
        };
      });

      // Sort by rating (highest to lowest)
      const sortedCourses = scoredCourses.sort((a, b) => b.rating - a.rating);
      
      console.log('🔍 Final sorted courses with scores:', sortedCourses.map(c => ({ 
        name: c.name, 
        score: c.rating,
        sentiment: c.sentiment,
        reason: c.scoreDetails?.reason,
        showScores: c.showScores
      })));
      
      // Update the context state instead of local state
      setPlayedCourses(sortedCourses);
      
    } catch (error) {
      console.error('🔍 ERROR in fetchPlayedCourses:', error);
      
      // LAST RESORT FALLBACK: Try to show something instead of nothing
      try {
        console.log('🔍 DEBUG: Attempting last resort fallback to show basic course list');
        
        // Get all reviews for this user (no joins)
        const { data: basicReviews, error: basicReviewsError } = await supabase
          .from('reviews')
          .select('course_id, rating')
          .eq('user_id', user?.id || '');
          
        if (basicReviewsError || !basicReviews || basicReviews.length === 0) {
          console.log('🔍 DEBUG: Last resort fallback failed - no reviews found');
          throw new Error('No reviews found');
        }
        
        // Get unique course IDs
        const uniqueCourseIds = [...new Set(basicReviews.map(r => r.course_id))];
        console.log('🔍 DEBUG: Found unique course IDs:', uniqueCourseIds);
        
        // Get basic course info
        const { data: basicCourses, error: basicCoursesError } = await supabase
          .from('courses')
          .select('id, name, location, type, price_level')
          .in('id', uniqueCourseIds);
          
        if (basicCoursesError || !basicCourses || basicCourses.length === 0) {
          console.log('🔍 DEBUG: Last resort fallback failed - no courses found');
          throw new Error('No courses found');
        }
        
        // Create a map of course sentiment ratings
        const courseSentiments = {};
        basicReviews.forEach(review => {
          courseSentiments[review.course_id] = review.rating;
        });
        
        // Create minimal course objects
        const minimalCourses = basicCourses.map(course => ({
          id: course.id,
          name: course.name,
          location: course.location || 'Unknown location',
          type: course.type || 'Course',
          price_level: course.price_level || 3,
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rating: 5.0, // Default rating
          sentiment: courseSentiments[course.id] || 'fine',
          showScores: userReviewCount >= 10 // Add this flag to each course
        }));
        
        console.log('🔍 DEBUG: Last resort fallback succeeded - displaying minimal courses:', 
          minimalCourses.map(c => ({ id: c.id, name: c.name }))
        );
        
        setPlayedCourses(minimalCourses);
        setError('Some course data may be incomplete. Pull down to refresh.');
        return;
      } catch (fallbackError) {
        console.error('🔍 ERROR: Last resort fallback also failed:', fallbackError);
        setError(`Failed to load played courses: ${error}. Last resort fallback also failed.`);
        setPlayedCourses([]);
      }
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
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: 20,
      fontWeight: 'bold',
    },
    header: {
      padding: 16,
      paddingTop: Platform.OS === 'ios' ? 44 : 16,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    debugPanel: {
      position: 'absolute',
      bottom: 90,
      left: 10,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 8,
      padding: 10,
      zIndex: 100,
    },
    debugHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    debugTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    debugCloseButton: {
      color: '#FF9999',
    },
    debugButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    debugButton: {
      backgroundColor: '#10B981',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
    debugButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
    },
  });

  // Memoize the CourseListTabs to prevent unnecessary re-renders
  const memoizedCourseListTabs = useMemo(() => (
    <CourseListTabs 
      playedCourses={playedCourses}
      wantToPlayCourses={wantToPlayCourses}
      recommendedCourses={recommendedCourses}
      onCoursePress={handleCoursePress}
      reviewCount={userReviewCount}
    />
  ), [playedCourses, wantToPlayCourses, recommendedCourses, userReviewCount]);

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
        
        {/* Add a prominent Dismiss button at the top */}
        {playedCourses.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              console.log('🔍 DEBUG: Dismissing error panel to show courses');
              setError(null);
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: '#10B981', // Green color for positive action
              borderRadius: 8,
              marginBottom: 15
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>DISMISS & SHOW COURSES ({playedCourses.length})</Text>
          </TouchableOpacity>
        )}
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          <TouchableOpacity 
            onPress={loadData}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              marginTop: 10
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Refresh Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              // Manually call the function that's defined at module level
              console.log('🔍 DEBUG: Manually triggering Direct Fetch');
              // Define a simplified version inline that has access to component state
              setLoading(true);
              setError(null);
              
              // Get all reviews for this user
              supabase
                .from('reviews')
                .select('*')
                .eq('user_id', user?.id)
                .then(({ data: reviews, error: reviewsError }) => {
                  if (reviewsError) {
                    console.error('Error fetching reviews:', reviewsError);
                    setError('Error fetching reviews: ' + reviewsError.message);
                    setLoading(false);
                    return;
                  }
                  
                  if (!reviews || reviews.length === 0) {
                    setError('No reviews found for your account');
                    setLoading(false);
                    return;
                  }
                  
                  // Get course IDs and fetch courses
                  const courseIds = reviews.map(r => r.course_id);
                  supabase
                    .from('courses')
                    .select('*')
                    .in('id', courseIds)
                    .then(({ data: courses, error: coursesError }) => {
                      if (coursesError) {
                        setError('Error fetching courses: ' + coursesError.message);
                        setLoading(false);
                        return;
                      }
                      
                      // Create simple course objects
                      const simpleCourses = courses.map(course => {
                        const review = reviews.find(r => r.course_id === course.id);
                        return {
                          id: course.id,
                          name: course.name,
                          location: course.location || 'Unknown location',
                          type: course.type || 'Golf Course',
                          price_level: course.price_level || 3,
                          rating: 8.5, // Fixed rating for testing
                          sentiment: review?.rating || 'liked',
                          description: '',
                          created_at: course.created_at || new Date().toISOString(),
                          updated_at: course.updated_at || new Date().toISOString(),
                          showScores: userReviewCount >= 10 // Add this flag to each course
                        };
                      });
                      
                      setPlayedCourses(simpleCourses);
                      setError('Using directly fetched data');
                      setLoading(false);
                      
                      // Force refresh
                      setRefreshKey(Date.now());
                    });
                });
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#4a5568',
              borderRadius: 6
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13 }}>Try Direct Fetch</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              console.log('🚨 EMERGENCY: Attempting to get courses directly from profile data');
              setLoading(true);
              setError(null);
              setUsingTestData(true); // Prevent automatic reloading
              
              try {
                if (!user?.id) {
                  setError('No user ID available. Please log in again.');
                  setLoading(false);
                  return;
                }
                
                // DIRECT APPROACH: Get ALL reviews in the system, then filter by user ID clientside
                // This is less efficient but might work if there's an issue with the user_id filter
                console.log('🚨 EMERGENCY: Getting ALL reviews');
                supabase
                  .from('reviews')
                  .select('*')
                  .then(({ data: allReviews, error: reviewsError }) => {
                    if (reviewsError) {
                      console.error('🚨 EMERGENCY: Error getting all reviews:', reviewsError.message);
                      setError(`Error: ${reviewsError.message}`);
                      setLoading(false);
                      return;
                    }
                    
                    // Filter reviews by user ID manually
                    const userReviews = allReviews.filter(r => r.user_id === user.id);
                    console.log('🚨 EMERGENCY: Found user reviews:', userReviews.length);
                    
                    if (userReviews.length === 0) {
                      setError('No reviews found for your account. Try adding some reviews first.');
                      setLoading(false);
                      return;
                    }
                    
                    // Get course IDs from the reviews
                    const courseIds = userReviews.map(r => r.course_id);
                    console.log('🚨 EMERGENCY: Course IDs from user reviews:', courseIds);
                    
                    // Get course data
                    supabase
                      .from('courses')
                      .select('*')
                      .then(({ data: coursesData, error: coursesError }) => {
                        if (coursesError) {
                          console.error('🚨 EMERGENCY: Error getting all courses:', coursesError.message);
                          setError(`Error: ${coursesError.message}`);
                          setLoading(false);
                          return;
                        }
                        
                        // Filter courses by IDs from reviews
                        const userCourses = coursesData.filter(c => courseIds.includes(c.id));
                        console.log('🚨 EMERGENCY: Found user courses:', userCourses.length);
                        
                        if (userCourses.length === 0) {
                          setError('No courses found matching your reviews.');
                          setLoading(false);
                          return;
                        }
                        
                        // Create a map of sentiment ratings from reviews
                        const sentimentMap = {};
                        userReviews.forEach(review => {
                          sentimentMap[review.course_id] = review.rating;
                        });
                        
                        // Create course objects with sentiment and appropriate ratings
                        const processedCourses = userCourses.map(course => {
                          const sentiment = sentimentMap[course.id] || 'fine';
                          
                          // Assign a base score based on sentiment
                          let score = 5.0;
                          if (sentiment === 'liked') score = 9.0;
                          else if (sentiment === 'fine') score = 5.5;
                          else if (sentiment === 'didnt_like') score = 2.0;
                          
                          return {
                            id: course.id,
                            name: course.name,
                            location: course.location || 'Unknown',
                            type: course.type || 'Golf Course',
                            price_level: course.price_level || 3,
                            description: '',
                            created_at: course.created_at || new Date().toISOString(),
                            updated_at: course.updated_at || new Date().toISOString(),
                            sentiment: sentiment,
                            rating: score,
                            showScores: userReviewCount >= 10 // Add this flag to each course
                          };
                        });
                        
                        // Group by sentiment for proper scoring
                        const likedCourses = processedCourses.filter(c => c.sentiment === 'liked');
                        const fineCourses = processedCourses.filter(c => c.sentiment === 'fine');
                        const didntLikeCourses = processedCourses.filter(c => c.sentiment === 'didnt_like');
                        
                        // Update scores based on position within sentiment group
                        const scoredCourses = processedCourses.map(course => {
                          let finalScore = course.rating;
                          
                          if (course.sentiment === 'liked') {
                            const position = likedCourses.findIndex(c => c.id === course.id);
                            const total = likedCourses.length;
                            
                            if (position === 0 || total === 1) {
                              finalScore = 10.0; // Top course always gets 10.0
                            } else {
                              finalScore = 7.0 + ((10.0 - 7.0) * (total - position - 1) / Math.max(total - 1, 1));
                            }
                          } else if (course.sentiment === 'fine') {
                            const position = fineCourses.findIndex(c => c.id === course.id);
                            const total = fineCourses.length;
                            
                            if (position === 0 || total === 1) {
                              finalScore = 6.9; // Top course always gets 6.9
                            } else {
                              finalScore = 3.0 + ((6.9 - 3.0) * (total - position - 1) / Math.max(total - 1, 1));
                            }
                          } else if (course.sentiment === 'didnt_like') {
                            const position = didntLikeCourses.findIndex(c => c.id === course.id);
                            const total = didntLikeCourses.length;
                            
                            if (position === 0 || total === 1) {
                              finalScore = 2.9; // Top course always gets 2.9
                            } else {
                              finalScore = 0.0 + ((2.9 - 0.0) * (total - position - 1) / Math.max(total - 1, 1));
                            }
                          }
                          
                          return {
                            ...course,
                            rating: parseFloat(finalScore.toFixed(1)),
                            showScores: userReviewCount >= 10 // Add this flag to each course
                          };
                        });
                        
                        // Sort by rating (highest first)
                        const sortedCourses = scoredCourses.sort((a, b) => b.rating - a.rating);
                        
                        console.log('🚨 EMERGENCY: Final processed courses:', sortedCourses.map(c => ({
                          name: c.name,
                          sentiment: c.sentiment,
                          rating: c.rating
                        })));
                        
                        try {
                          // Update the context state instead of local state
                          setPlayedCourses(sortedCourses);
                          setError('Using emergency direct data loading.');
                          
                          // Force a complete re-render with multiple updates
                          setRefreshKey(Date.now());
                          
                          // Add an additional delayed refresh for safety
                          setTimeout(() => {
                            setRefreshKey(prev => prev + 1);
                            console.log('EMERGENCY: Triggered secondary refresh');
                          }, 300);
                        } catch (stateError) {
                          console.error('🚨 EMERGENCY: Error updating state:', stateError);
                          setError(`Error updating state: ${stateError.message}`);
                        } finally {
                          setLoading(false);
                        }
                      })
                      .catch(err => {
                        console.error('🚨 EMERGENCY: Unexpected fetch error:', err);
                        setError(`Unexpected fetch error: ${err.message}`);
                        setLoading(false);
                      });
                  })
                  .catch(err => {
                    console.error('🚨 EMERGENCY: Unexpected reviews error:', err);
                    setError(`Unexpected reviews error: ${err.message}`);
                    setLoading(false);
                  });
              } catch (error) {
                console.error('🚨 EMERGENCY: Unexpected error:', error);
                setError(`Unexpected error: ${error.message}`);
                setLoading(false);
              }
            }}
            style={{
              alignSelf: 'center',
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: '#805ad5',
              borderRadius: 4,
              marginTop: 8
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12 }}>Get Profile Courses</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              // Inline hardcoded data function
              console.log('🔍 DEBUG: Using hardcoded data');
              
              // Add this line to prevent automatic reloading
              setUsingTestData(true);
              
              const hardcodedCourses = [
                {
                  id: 'hc1',
                  name: 'TEST - Augusta National',
                  location: 'Augusta, GA',
                  type: 'Championship Course',
                  price_level: 5,
                  description: 'Home of the Masters',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  rating: 10.0,
                  sentiment: 'liked',
                  showScores: userReviewCount >= 10 // Add this flag to each course
                },
                {
                  id: 'hc2',
                  name: 'TEST - Pebble Beach',
                  location: 'Pebble Beach, CA',
                  type: 'Resort Course',
                  price_level: 4,
                  description: 'Iconic oceanside course',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  rating: 8.5,
                  sentiment: 'liked',
                  showScores: userReviewCount >= 10 // Add this flag to each course
                },
                {
                  id: 'hc3',
                  name: 'TEST - St Andrews',
                  location: 'St Andrews, Scotland',
                  type: 'Links Course',
                  price_level: 3,
                  description: 'The home of golf',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  rating: 6.9,
                  sentiment: 'fine',
                  showScores: userReviewCount >= 10 // Add this flag to each course
                }
              ];
              
              setPlayedCourses(hardcodedCourses);
              setRefreshKey(Date.now());
              setError('Using test data');
              setLoading(false);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#e53e3e',
              borderRadius: 6
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13 }}>Use Test Data</Text>
          </TouchableOpacity>
        </View>
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

  // Add a deep inspection of the playedCourses array
  console.log('🔎 DEEP DIAGNOSTIC: Final playedCourses state before rendering:', {
    isArray: Array.isArray(playedCourses),
    length: playedCourses?.length || 0,
    isEmpty: playedCourses?.length === 0,
    validCourseObjects: playedCourses?.every(c => 
      c && typeof c === 'object' && 'id' in c && 'name' in c && 'rating' in c
    ),
    firstThreeCourses: playedCourses?.slice(0, 3).map(c => ({
      id: c.id,
      name: c.name,
      rating: c.rating,
      sentiment: c.sentiment,
      allProps: Object.keys(c)
    }))
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Lists</Text>
      </View>
      
      {/* Main content with optimized rendering */}
      {memoizedCourseListTabs}
      
      {/* Debug panel */}
      {showDebugPanel && (
        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Controls</Text>
            <TouchableOpacity onPress={() => setShowDebugPanel(false)}>
              <Text style={styles.debugCloseButton}>Hide</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.debugButtons}>
            <TouchableOpacity 
              style={styles.debugButton} 
              onPress={loadData}>
              <Text style={styles.debugButtonText}>Refresh Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#4299e1' }]} 
              onPress={useHardcodedData}>
              <Text style={styles.debugButtonText}>Use Test Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Update the triggerDirectFetch function with a much simpler approach
const triggerDirectFetch = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('🔍 SUPER SIMPLE: Starting simplified fetch approach');
    console.log('🔍 SUPER SIMPLE: User ID is:', user?.id);
    
    if (!user?.id) {
      console.error('🔍 SUPER SIMPLE: No user ID available! Authentication issue.');
      setError('Authentication issue: No user ID available. Please log out and back in.');
      setLoading(false);
      return;
    }
    
    // STEP 1: Just try to get ANY reviews for this user
    console.log('🔍 SUPER SIMPLE: Checking for reviews...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id);
    
    if (reviewsError) {
      console.error('🔍 SUPER SIMPLE: Error fetching reviews:', reviewsError.message);
      setError(`Error fetching reviews: ${reviewsError.message}`);
      setLoading(false);
      return;
    }
    
    console.log('🔍 SUPER SIMPLE: Reviews result:', {
      count: reviews?.length || 0,
      reviews: reviews?.map(r => ({
        id: r.id,
        courseId: r.course_id,
        sentiment: r.rating,
        userId: r.user_id
      }))
    });
    
    if (!reviews || reviews.length === 0) {
      console.log('🔍 SUPER SIMPLE: No reviews found for this user ID');
      setError('No reviews found for your account. Try adding some course reviews first.');
      setLoading(false);
      return;
    }
    
    // STEP 2: Get all the course data in one simple query
    const courseIds = reviews.map(r => r.course_id);
    console.log('🔍 SUPER SIMPLE: Course IDs from reviews:', courseIds);
    
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds);
    
    if (coursesError) {
      console.error('🔍 SUPER SIMPLE: Error fetching courses:', coursesError.message);
      setError(`Error fetching courses: ${coursesError.message}`);
      setLoading(false);
      return;
    }
    
    console.log('🔍 SUPER SIMPLE: Courses result:', {
      expected: courseIds.length,
      found: courses?.length || 0,
      courses: courses?.map(c => ({ id: c.id, name: c.name }))
    });
    
    if (!courses || courses.length === 0) {
      console.log('🔍 SUPER SIMPLE: No courses found matching the review course IDs');
      setError('No courses found matching your reviews. Database issue detected.');
      setLoading(false);
      return;
    }
    
    // STEP 3: Create a simple map of reviews by course ID for sentiment lookup
    const reviewByCourseId = {};
    reviews.forEach(review => {
      reviewByCourseId[review.course_id] = review;
    });
    
    // STEP 4: Create very basic course objects with fixed scores based on sentiment
    const simpleCourses = courses.map(course => {
      const review = reviewByCourseId[course.id];
      const sentiment = review?.rating || 'unknown';
      
      // Assign a simple score based on sentiment
      let score = 5.0;
      if (sentiment === 'liked') score = 8.0;
      else if (sentiment === 'fine') score = 5.0;
      else if (sentiment === 'didnt_like') score = 2.0;
      
      return {
        id: course.id,
        name: course.name,
        location: course.location || 'Unknown location',
        type: course.type || 'Golf Course',
        price_level: course.price_level || 3,
        description: '',
        created_at: course.created_at || new Date().toISOString(),
        updated_at: course.updated_at || new Date().toISOString(),
        rating: score,
        showScores: userReviewCount >= 10 // Add this flag to each course
      };
    });
    
    console.log('🔍 SUPER SIMPLE: Created simple course objects:', {
      count: simpleCourses.length,
      courses: simpleCourses.map(c => ({
        id: c.id,
        name: c.name,
        sentiment: c.sentiment,
        score: c.rating
      }))
    });
    
    // Success! Update the context state with our simple course objects
    setPlayedCourses(simpleCourses);
    setError('Using simplified scoring (fixed values based on sentiment). Restart app for normal scoring.');
    
    console.log('🔍 SUPER SIMPLE: Successfully set played courses state:', {
      count: simpleCourses.length,
      success: true
    });
  } catch (error) {
    console.error('🔍 SUPER SIMPLE: Unexpected error:', error);
    setError(`Unexpected error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Update the useHardcodedData function to set the flag and prevent reloads
const useHardcodedData = () => {
  console.log('🚨 EMERGENCY: Using hardcoded course data');
  
  // Set the flag to prevent automatic reloading
  setUsingTestData(true);
  
  // Create hardcoded courses that match the Course type
  const hardcodedCourses = [
    {
      id: 'hc1',
      name: 'TEST - Augusta National',
      location: 'Augusta, GA',
      type: 'Championship Course',
      price_level: 5,
      description: 'Home of the Masters',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating: 10.0,
      sentiment: 'liked',
      showScores: userReviewCount >= 10 // Add this flag to each course
    },
    {
      id: 'hc2',
      name: 'TEST - Pebble Beach',
      location: 'Pebble Beach, CA',
      type: 'Resort Course',
      price_level: 4,
      description: 'Iconic oceanside course',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating: 8.5,
      sentiment: 'liked',
      showScores: userReviewCount >= 10 // Add this flag to each course
    },
    {
      id: 'hc3',
      name: 'TEST - St Andrews',
      location: 'St Andrews, Scotland',
      type: 'Links Course',
      price_level: 3,
      description: 'The home of golf',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating: 6.9,
      sentiment: 'fine',
      showScores: userReviewCount >= 10 // Add this flag to each course
    },
    {
      id: 'hc4',
      name: 'TEST - Torrey Pines',
      location: 'La Jolla, CA',
      type: 'Public Course',
      price_level: 2,
      description: 'Beautiful municipal course',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating: 2.9,
      sentiment: 'didnt_like',
      showScores: userReviewCount >= 10 // Add this flag to each course
    }
  ];
  
  console.log('🚨 EMERGENCY: Hardcoded courses data created:', {
    count: hardcodedCourses.length,
    firstCourse: hardcodedCourses[0],
    isArray: Array.isArray(hardcodedCourses)
  });
  
  // Set the courses directly
  setPlayedCourses(hardcodedCourses);
  
  // Also update the Tab's key to force a fresh render
  setRefreshKey(Date.now());
  
  // Force a stronger re-render to ensure the courses stay displayed
  setTimeout(() => {
    console.log('🚨 EMERGENCY: Reinforcing hardcoded data with a second update');
    
    // This double update ensures the state change persists
    setPlayedCourses([...hardcodedCourses]);
    
    // Force a refresh again after a short delay
    setTimeout(() => {
      setRefreshKey(Date.now() + 1);
    }, 300);
  }, 500);
  
  setError('⚠️ Using hardcoded test data - this is not from your database. Automatic reloading disabled.');
  setLoading(false);
};

// After the toggleDirectFetch function, add a new emergency function to directly get profile page courses
// Add a new emergency function to get courses directly from profile
const getCoursesFromProfile = async () => {
  // Delete this entire function or comment it out - we're replacing all calls with inline functions
}; 