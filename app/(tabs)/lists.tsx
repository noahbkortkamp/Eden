import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView, Dimensions, Platform, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Tabs, TabRoute } from '../components/eden/Tabs';
import { Course } from '../types/review';
import { supabase } from '../utils/supabase';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { rankingService } from '../services/rankingService';
import { useAuth } from '../context/AuthContext';
import { courseListService } from '../services/courseListService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { reviewService } from '../services/reviewService';
import { PlayedCoursesList } from '../components/PlayedCoursesList';
import { WantToPlayCoursesList } from '../components/WantToPlayCoursesList';
import BasicWantToPlayList from '../components/BasicWantToPlayList';
import { MapPin, X, Bookmark as BookmarkIcon, Search, Star, Plus } from 'lucide-react-native';
import { Heading1, BodyText, Heading2 } from '../components/eden/Typography';
import { Icon } from '../components/eden/Icon';
import { LazyTabWrapper } from '../components/LazyTabWrapper';
import { useTabLazyLoadingContext } from '../context/TabLazyLoadingContext';
import { useSmartTabFocus } from '../hooks/useSmartTabFocus';
import { playedCoursesService, EnhancedCourse } from '../services/playedCoursesService';

// Define the SentimentRating type directly
type SentimentRating = 'liked' | 'fine' | 'didnt_like';

// Extend the Course type to include the properties we're using
interface EnhancedCourse extends Course {
  rank_position?: number;
  sentiment?: SentimentRating;
  showScores?: boolean;
}

// Main content component that contains the heavy data logic
function ListsScreenContent() {
  const theme = useTheme();
  const { user } = useAuth();
  const { initialTab } = useLocalSearchParams<{ initialTab?: 'played' | 'want-to-play' }>();
  const [courseType, setCourseType] = useState<'played' | 'recommended' | 'want-to-play'>(
    initialTab || 'played'
  );
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
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Track the last time we refreshed to prevent too many reloads
  const lastRefreshTime = useRef(0);
  // Minimum time between refreshes (2 seconds)
  const REFRESH_THROTTLE_MS = 2000;

  const [userReviewCount, setUserReviewCount] = useState<number | null>(null);
  const [isReviewCountLoading, setIsReviewCountLoading] = useState(true);
  
  // Add a ref to track the last update timestamp
  const currentTimestampRef = useRef(lastUpdateTimestamp);

  // Add a ref to hold the fetchWantToPlayCourses function
  const fetchWantToPlayCoursesRef = useRef<(() => Promise<void>) | null>(null);

  // Enhanced debug - log when component mounts or remounts
  useEffect(() => {
    console.log('📌 ListsScreen Mounted - STARTING REVIEW COUNT CHECK');
    // Immediately check review count on startup
    if (user) {
      console.log('🚀 STARTUP CHECK: Immediately checking review count for user', user.id);
      setIsReviewCountLoading(true);
      reviewService.getUserReviewCount(user.id)
        .then(count => {
          console.log(`🚨 INITIAL LOAD: User has ${count} reviews. Score visibility ${count >= 10 ? 'SHOULD BE ENABLED' : 'DISABLED'}`);
          setUserReviewCount(count);
          
          // Immediately update course scores when we get the count on startup
          if (count >= 10 && playedCourses.length > 0) {
            console.log('🚨 IMMEDIATE UPDATE: Updating course scores on startup because count >= 10');
            const updatedPlayedCourses = playedCourses.map(course => ({
              ...course,
              showScores: true // Explicitly set to true for 10+ reviews
            }));
            setPlayedCourses(updatedPlayedCourses);
            setRefreshKey(Date.now());
          }
          setIsReviewCountLoading(false);
        })
        .catch(err => {
          console.error('Error fetching user review count on startup:', err);
          setIsReviewCountLoading(false);
        });
    } else {
      setIsReviewCountLoading(false);
    }
    
    return () => console.log('📌 ListsScreen Unmounted');
  }, []);

  // Load user review count on initial render
  useEffect(() => {
    async function loadUserReviewCount() {
      if (user) {
        try {
          setIsReviewCountLoading(true);
          const count = await reviewService.getUserReviewCount(user.id);
          console.log(`🔢 User has ${count} reviews. Score visibility: ${count >= 10 ? 'ENABLED' : 'DISABLED'}`);
          const previousCount = userReviewCount;
          setUserReviewCount(count);
          
          // If user has crossed the 10 review threshold, force refresh the data
          if (previousCount !== null && previousCount < 10 && count >= 10) {
            console.log('🎉 User just crossed 10 review threshold! Forcing data refresh');
            loadData();
          }
          setIsReviewCountLoading(false);
        } catch (err) {
          console.error('Error fetching user review count:', err);
          setIsReviewCountLoading(false);
        }
      } else {
        setIsReviewCountLoading(false);
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

  // Optimized useFocusEffect with simple debouncing instead of complex smart caching for now
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Lists tab focused - simple optimization');
      
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime.current;
      
      // Only reload if enough time has passed (simple throttling)
      if (timeSinceLastRefresh < REFRESH_THROTTLE_MS) {
        console.log(`⏭️ Lists: Skipping refresh - too soon (${timeSinceLastRefresh}ms since last)`);
        return;
      }
      
      // Only reload if not using test data and don't have courses loaded
      if (!usingTestData && !hasLoadedCourses) {
        console.log('🚀 Lists: Loading data on focus');
        lastRefreshTime.current = now;
        loadData();
      } else {
        console.log('💾 Lists: Skipping reload - data already loaded or using test data');
      }
      
      return () => {
        console.log('📱 Lists tab lost focus');
      };
    }, [usingTestData, hasLoadedCourses, loadData])
  );

  // Watch for changes in userReviewCount and update showScores property for all courses
  useEffect(() => {
    // Skip on initial render when userReviewCount is still 0
    if (playedCourses.length > 0) {
      console.log(`🔄 Updating showScores flag for all courses. Review count: ${userReviewCount}`);
      
      // Update played courses with correct showScores flag
      const updatedPlayedCourses = playedCourses.map(course => ({
        ...course,
        showScores: userReviewCount !== null && userReviewCount >= 10
      }));
      
      // Update want to play courses
      const updatedWantToPlayCourses = wantToPlayCourses.map(course => ({
        ...course,
        showScores: userReviewCount !== null && userReviewCount >= 10
      }));
      
      // Update recommended courses
      const updatedRecommendedCourses = recommendedCourses.map(course => ({
        ...course,
        showScores: userReviewCount !== null && userReviewCount >= 10
      }));
      
      // Update all course lists
      setPlayedCourses(updatedPlayedCourses);
      setWantToPlayCourses(updatedWantToPlayCourses);
      setRecommendedCourses(updatedRecommendedCourses);
      
      // Force a UI refresh
      setRefreshKey(Date.now());
    }
  }, [userReviewCount]);

  // Centralized data loading function
  const loadData = async () => {
    if (!user) {
      console.log('ListsScreen: User not found, aborting data load');
      return;
    }

    setError(null);
    setLoading(true);
    setCoursesLoading(true); // Update context loading state

    try {
      console.log('ListsScreen: Starting data load...');
      
      // Load user review count first
      if (user) {
        try {
          setIsReviewCountLoading(true);
          const count = await reviewService.getUserReviewCount(user.id);
          console.log(`🔢 User has ${count} reviews. Score visibility: ${count >= 10 ? 'ENABLED' : 'DISABLED'}`);
          setUserReviewCount(count);
          setIsReviewCountLoading(false);
        } catch (err) {
          console.error('Error fetching user review count:', err);
          setIsReviewCountLoading(false);
        }
      }
      
      // Then load course data
      await Promise.all([
        fetchPlayedCourses(),
        fetchWantToPlayCourses(),
        fetchRecommendedCourses()
      ]);
      
      // Mark courses as loaded
      setHasLoadedCourses(true);
      
      console.log('ListsScreen: Data load completed successfully');
    } catch (error) {
      console.error('Error loading Lists data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setCoursesLoading(false); // Update context loading state
    }
  };

  const fetchPlayedCourses = async () => {
    if (!user) {
      console.log('🔍 [LISTS] No user found, returning empty array');
      setPlayedCourses([]);
      return [];
    }

    const showScores = userReviewCount !== null && userReviewCount >= 10;
    console.log(`🔍 [LISTS] Fetching played courses for user ${user.id.substring(0, 8)} with showScores: ${showScores}`);
    
    try {
      // Use the new simplified service
      const courses = await playedCoursesService.getPlayedCoursesSimplified(user.id, showScores);
      
      // Validate the data before setting it
      const isValid = playedCoursesService.validateCourseData(courses);
      if (!isValid) {
        console.warn('🚨 [LISTS] Course data validation failed, but continuing');
      }
      
      console.log(`✅ [LISTS] Successfully fetched ${courses.length} played courses`);
      
      // Update the context state
      setPlayedCourses(courses);
      return courses;
      
    } catch (error) {
      console.error('🚨 [LISTS] Error in fetchPlayedCourses:', error);
      setError(`Failed to load played courses: ${error}`);
      setPlayedCourses([]);
      return [];
    }
  };

  // Fetch Want to Play courses directly from the database, similar to how we fetch played courses
  const fetchWantToPlayCourses = async () => {
    if (!user) {
      setWantToPlayCourses([]);
      return;
    }

    console.log('🔄 Starting fetchWantToPlayCourses for user', user.id);
    
    try {
      // IMPROVED APPROACH: Use a more efficient join-like query to get both bookmark data and course details
      // First check if the table exists and has data for this user
      const { data: bookmarkedCheck, error: checkError } = await supabase
        .from('want_to_play_courses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
        
      if (checkError) {
        console.error('Error checking want_to_play_courses:', checkError);
        setWantToPlayCourses([]);
        return;
      }
      
      // Log some diagnostic information
      console.log(`Found ${bookmarkedCheck?.length || 0} want_to_play_courses records for user`);
      
      if (bookmarkedCheck && bookmarkedCheck.length > 0) {
        // Step 1: Get all bookmarked course IDs
        const { data: bookmarkedItems, error: bookmarkError } = await supabase
          .from('want_to_play_courses')
          .select('course_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (bookmarkError) {
          console.error('Error fetching bookmarked courses:', bookmarkError);
          setWantToPlayCourses([]);
          return;
        }
        
        console.log(`Retrieved ${bookmarkedItems?.length || 0} bookmarked course IDs`);
        
        if (!bookmarkedItems || bookmarkedItems.length === 0) {
          setWantToPlayCourses([]);
          return;
        }
        
        // Step 2: Extract the course IDs for the IN query
        const courseIds = bookmarkedItems.map(item => item.course_id);
        console.log(`Extracted ${courseIds.length} course IDs`);
        
        // Step 2.5: Get the list of courses the user has already reviewed
        const { data: reviewedCourses, error: reviewedError } = await supabase
          .from('reviews')
          .select('course_id')
          .eq('user_id', user.id);
          
        if (reviewedError) {
          console.error('Error fetching reviewed courses:', reviewedError);
          // Continue with all bookmarked courses if we can't check reviews
        }
        
        // Create a set of reviewed course IDs for efficient lookup
        const reviewedCourseIds = new Set(reviewedCourses?.map(item => item.course_id) || []);
        console.log(`User has reviewed ${reviewedCourseIds.size} courses`);
        
        // Filter out courses that have already been reviewed
        const filteredCourseIds = courseIds.filter(courseId => !reviewedCourseIds.has(courseId));
        console.log(`After filtering out reviewed courses, ${filteredCourseIds.length} courses remain`);
        
        // If all bookmarked courses have been reviewed, return empty array
        if (filteredCourseIds.length === 0) {
          console.log('All bookmarked courses have been reviewed, returning empty array');
          setWantToPlayCourses([]);
          return;
        }
        
        // Step 3: Get the full course details from the courses table
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, name, location, type, price_level')
          .in('id', filteredCourseIds);
        
        if (coursesError) {
          console.error('Error fetching course details:', coursesError);
          setWantToPlayCourses([]);
          return;
        }
        
        console.log(`Retrieved ${coursesData?.length || 0} course details`);
        
        // Step 4: Combine the data, keeping the order from bookmarkedItems
        const sortedWantToPlayCourses = filteredCourseIds.map(courseId => {
          const courseDetails = coursesData.find(course => course.id === courseId);
          if (!courseDetails) {
            console.warn(`Missing details for course ID: ${courseId}`);
            return null;
          }
          
          return {
            id: courseDetails.id,
            name: courseDetails.name || 'Unknown Course',
            location: courseDetails.location || 'Unknown Location',
            type: courseDetails.type || 'Unknown Type',
            price_level: courseDetails.price_level || 3
          };
        }).filter(course => course !== null);
        
        console.log(`Processed ${sortedWantToPlayCourses.length} want to play courses for display`);
        setWantToPlayCourses(sortedWantToPlayCourses);
      } else {
        console.log('No want_to_play_courses records found, returning empty array');
        setWantToPlayCourses([]);
      }
      
      // Force refresh the UI
      setRefreshKey(Date.now());
    } catch (err) {
      console.error('Error in fetchWantToPlayCourses:', err);
      setWantToPlayCourses([]);
    }
  };

  // Update the ref after fetchWantToPlayCourses is defined
  useEffect(() => {
    fetchWantToPlayCoursesRef.current = fetchWantToPlayCourses;
  }, []);

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

  const handleCoursePress = async (course: Course) => {
    // If user is not logged in, just show the course details
    if (!user?.id) {
      router.push({
        pathname: '/(modals)/course-details',
        params: { courseId: course.id }
      });
      return;
    }

    try {
      // Check if the user has reviewed this course
      const reviewExists = await reviewService.getUserCourseReview(user.id, course.id);
      
      if (reviewExists) {
        // User has reviewed this course, navigate to review summary
        router.push({
          pathname: '/review/summary',
          params: { courseId: course.id, userId: user.id }
        });
      } else {
        // No review exists, navigate to course details
        router.push({
          pathname: '/(modals)/course-details',
          params: { courseId: course.id }
        });
      }
    } catch (error) {
      console.error('Error checking for review:', error);
      // On error, default to course details
      router.push({
        pathname: '/(modals)/course-details',
        params: { courseId: course.id }
      });
    }
  };

  // Convert the courseType to a numeric tab index
  const tabIndex = useMemo(() => {
    switch (courseType) {
      case 'played': return 0;
      case 'want-to-play': return 1;
      case 'recommended': return 2;
      default: return 0;
    }
  }, [courseType]);

  // Define the tab routes
  const tabRoutes: TabRoute[] = [
    { key: 'played', title: 'Played' },
    { key: 'wantToPlay', title: 'Want to Play' },
    { key: 'recommended', title: 'Recommended' },
  ];

  // Handle tab change
  const handleTabChange = (index: number) => {
    let newType: 'played' | 'recommended' | 'want-to-play';
    switch (index) {
      case 0:
        newType = 'played';
        break;
      case 1:
        newType = 'want-to-play';
        break;
      case 2:
        newType = 'recommended';
        break;
      default:
        newType = 'played';
    }
    setCourseType(newType);
  };

  // Render tab content
  const renderTabContent = useCallback((route: TabRoute) => {
    if (isCoursesLoading) {
      return (
        <View style={edenStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={edenStyles.errorContainer}>
          <BodyText color={theme.colors.error}>{error}</BodyText>
        </View>
      );
    }

    switch (route.key) {
      case 'played':
        return (
          <View style={edenStyles.tabContent}>
            {!isReviewCountLoading && userReviewCount !== null && userReviewCount < 10 && (
              <TouchableOpacity 
                style={edenStyles.notificationBanner}
                onPress={() => router.push('/(tabs)/search')}
                activeOpacity={0.8}
              >
                <BodyText style={edenStyles.notificationText}>
                  Submit {10 - userReviewCount} more {10 - userReviewCount === 1 ? 'review' : 'reviews'} to unlock your personalized course ratings.
                </BodyText>
                <View style={edenStyles.addButtonContainer}>
                  <Plus size={18} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
            )}
            <PlayedCoursesList 
              courses={playedCourses} 
              handleCoursePress={handleCoursePress}
              showScores={userReviewCount !== null && userReviewCount >= 10}
            />
          </View>
        );
      case 'wantToPlay':
        return (
          <View style={edenStyles.tabContent}>
            <WantToPlayCoursesList
              courses={wantToPlayCourses}
              handleCoursePress={handleCoursePress}
              showScores={userReviewCount !== null && userReviewCount >= 10}
            />
          </View>
        );
      case 'recommended':
        return (
          <View style={edenStyles.tabContent}>
            <View style={edenStyles.comingSoonContainer}>
              <View style={edenStyles.comingSoonIconContainer}>
                <Star size={32} color={theme.colors.primary} strokeWidth={1.5} />
              </View>
              <Heading2 color={theme.colors.primary} style={edenStyles.comingSoonHeading}>Coming soon</Heading2>
              <BodyText center style={edenStyles.comingSoonText}>
                Personalized course recommendations based on your playing history and preferences will appear here.
              </BodyText>
            </View>
          </View>
        );
      default:
        return null;
    }
  }, [playedCourses, wantToPlayCourses, recommendedCourses, isCoursesLoading, error, userReviewCount, isReviewCountLoading, handleCoursePress]);

  // Handle initial tab selection and data loading
  useEffect(() => {
    if (initialTab) {
      console.log('Setting initial tab to:', initialTab);
      setCourseType(initialTab);
      
      // Force a data refresh when navigating from profile
      if (!isCoursesLoading && user) {
        console.log('Loading data for initial tab:', initialTab);
        loadData();
      }
    }
  }, [initialTab, user]);

  if (!user) {
    return null;
  }

  return (
    <View style={edenStyles.container}>
      <Tabs
        routes={tabRoutes}
        selectedIndex={tabIndex}
        onIndexChange={handleTabChange}
        renderScene={renderTabContent}
        style={edenStyles.tabs}
      />
      
      {/* ... existing debug panel and other UI elements ... */}
    </View>
  );
}

// Eden styled styles
const edenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EC', // Eden background color
  },
  tabs: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(35, 77, 44, 0.1)', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  comingSoonHeading: {
    marginBottom: 12,
  },
  comingSoonText: {
    maxWidth: '80%',
    color: '#666666', // Using a direct color value instead of theme.colors.textSecondary
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2E7C9', // Eden neutral feedback color
    paddingVertical: 16,
    paddingLeft: 18,
    paddingRight: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D9B7', // Slightly darker border for definition
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationText: {
    flex: 1,
    color: '#234D2C', // Eden primary text color
    lineHeight: 20,
  },
  addButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(35, 77, 44, 0.1)', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
});

// Export the lazy-loaded version
export default function ListsScreen() {
  const { isTabActivated } = useTabLazyLoadingContext();
  const tabName = 'lists';
  
  const handleFirstActivation = () => {
    console.log('🚀 Lists tab: First activation - will load heavy data');
    // The heavy data loading will be triggered by the component mount
  };
  
  return (
    <LazyTabWrapper
      isActive={true} // This tab is controlled by the navigation
      hasBeenActive={isTabActivated(tabName)}
      onFirstActivation={handleFirstActivation}
      tabName="Your Courses"
    >
      <ListsScreenContent />
    </LazyTabWrapper>
  );
} 