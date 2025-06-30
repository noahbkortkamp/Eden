import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView, Dimensions, Platform, FlatList, AppState } from 'react-native';
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
import { ListSkeleton } from '../components/eden/SkeletonLoader';

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
  const {
    playedCourses,
    setPlayedCourses,
    wantToPlayCourses,
    setWantToPlayCourses,
    recommendedCourses,
    setRecommendedCourses,
    isCoursesLoading,
    setCoursesLoading,
    hasLoadedCourses,
    setHasLoadedCourses,
    lastUpdateTimestamp,
    setNeedsRefresh,
    refreshLists,
    dataFingerprint // Phase 2: Use new dataFingerprint from context
  } = usePlayedCourses();

  const [error, setError] = useState<string | null>(null);
  const [userReviewCount, setUserReviewCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Phase 2: Smart state management
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(0);
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);
  const isMountedRef = useRef(true);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const BACKGROUND_REFRESH_THRESHOLD = 30 * 1000; // 30 seconds

  // Phase 2: Memoized styles
  const containerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: theme.colors.background,
  }), [theme.colors.background]);

  const errorStyle = useMemo(() => ({
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  }), [theme.colors.error, theme.spacing.md, theme.borderRadius.md]);

  // Phase 2: Smart refresh logic - only refresh when needed
  const shouldRefreshData = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimestamp;
    
    // Refresh if:
    // 1. Never loaded before
    // 2. Data is stale (older than cache duration)
    // 3. Context indicates refresh needed (lastUpdateTimestamp changed)
    // 4. App became active after being in background
    
    return !hasLoadedCourses || 
           timeSinceLastFetch > CACHE_DURATION ||
           lastUpdateTimestamp > lastFetchTimestamp ||
           (appStateVisible === 'active' && timeSinceLastFetch > BACKGROUND_REFRESH_THRESHOLD);
  }, [hasLoadedCourses, lastFetchTimestamp, lastUpdateTimestamp, appStateVisible]);

  // Phase 2: Background app state monitoring for smart refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (appStateVisible.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 [LISTS] App became active - checking if refresh needed');
        if (shouldRefreshData()) {
          console.log('📱 [LISTS] Triggering background refresh');
          loadData();
        }
      }
      setAppStateVisible(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appStateVisible, shouldRefreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const params = useLocalSearchParams();
  const tab = params.tab as string;

  const initialTab = useMemo(() => {
    switch (tab) {
      case 'want-to-play':
        return 1;
      case 'recommended':
        return 2;
      default:
        return 0;
    }
  }, [tab]);

  // Define tabs using useMemo for performance
  const tabs: TabRoute[] = useMemo(() => [
    { key: 'played', title: 'Played', icon: 'List' },
    { key: 'wantToPlay', title: 'Want to Play', icon: 'BookOpen' },
    { key: 'recommended', title: 'Recommended', icon: 'Lightbulb' },
  ], []);

  const [courseType, setCourseType] = useState<'played' | 'recommended' | 'want-to-play'>('played');

  // Track tab focus for smart loading
  const { isActiveTab, handleTabActivation } = useSmartTabFocus('lists');

  // Load user review count for score visibility
  async function loadUserReviewCount() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading user review count:', error);
        return;
      }

      const count = data?.length || 0;
      setUserReviewCount(count);
      console.log(`✅ [LISTS] User has ${count} reviews`);
    } catch (error) {
      console.error('Error in loadUserReviewCount:', error);
    }
  }

  // Phase 2: Optimized data loading with smart refresh logic
  const loadData = useCallback(async () => {
    if (!user) {
      console.log('🔍 [LISTS] No user found, skipping data load');
      return;
    }

    // Phase 2: Check if refresh is actually needed
    if (!shouldRefreshData() && hasLoadedCourses) {
      console.log('🔍 [LISTS] Data is still fresh, skipping refresh');
      return;
    }

    console.log('🔍 [LISTS] Starting data load...');
    setCoursesLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      
      // Load review count and courses in parallel
      await Promise.all([
        loadUserReviewCount(),
        fetchPlayedCourses(),
        fetchWantToPlayCourses(),
        fetchRecommendedCourses()
      ]);

      setLastFetchTimestamp(timestamp);
      setHasLoadedCourses(true);
      console.log('✅ [LISTS] Data load completed successfully');
      
    } catch (error) {
      console.error('🚨 [LISTS] Error in loadData:', error);
      setError(`Failed to load data: ${error}`);
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setCoursesLoading(false);
      }
    }
  }, [user, shouldRefreshData, hasLoadedCourses]);

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
      
      // Phase 2: Only update state if component is still mounted
      if (isMountedRef.current) {
        setPlayedCourses(courses);
      }
      return courses;
      
    } catch (error) {
      console.error('🚨 [LISTS] Error in fetchPlayedCourses:', error);
      if (isMountedRef.current) {
        setError(`Failed to load played courses: ${error}`);
        setPlayedCourses([]);
      }
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
        
        // Phase 2: Only update state if component is still mounted
        if (isMountedRef.current) {
          setWantToPlayCourses(sortedWantToPlayCourses);
        }
      } else {
        console.log('No want_to_play_courses records found, returning empty array');
        if (isMountedRef.current) {
          setWantToPlayCourses([]);
        }
      }
      
      // Force refresh the UI
      setRefreshKey(Date.now());
    } catch (err) {
      console.error('Error in fetchWantToPlayCourses:', err);
      if (isMountedRef.current) {
        setWantToPlayCourses([]);
      }
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

  // Phase 2: Enhanced tab content rendering with skeleton loading states
  const renderTabContent = useCallback((route: TabRoute) => {
    // Phase 2: Show skeleton loaders during loading for better UX
    if (isCoursesLoading) {
      const showScores = userReviewCount !== null && userReviewCount >= 10;
      
      switch (route.key) {
        case 'played':
          return <ListSkeleton itemCount={4} showScores={showScores} itemType="course" />;
        case 'wantToPlay':
          return <ListSkeleton itemCount={3} showScores={false} itemType="simple" />;
        case 'recommended':
          return <ListSkeleton itemCount={3} showScores={showScores} itemType="course" />;
        default:
          return <ListSkeleton itemCount={3} showScores={false} itemType="course" />;
      }
    }

    if (error) {
      return (
        <View style={edenStyles.errorContainer}>
          <BodyText color={theme.colors.error}>{error}</BodyText>
          <TouchableOpacity 
            style={edenStyles.retryButton}
            onPress={loadData}
          >
            <BodyText color={theme.colors.primary}>Retry</BodyText>
          </TouchableOpacity>
        </View>
      );
    }

    switch (route.key) {
      case 'played':
        return (
          <View style={edenStyles.tabContent}>
            {!isCoursesLoading && userReviewCount !== null && userReviewCount < 10 && (
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
  }, [playedCourses, wantToPlayCourses, recommendedCourses, isCoursesLoading, error, userReviewCount, handleCoursePress, loadData]);

  // Phase 2: Smart initial data loading with focus effect
  useFocusEffect(
    useCallback(() => {
      console.log('📱 [LISTS] Tab focused - checking if data load needed');
      
      if (!user) {
        console.log('📱 [LISTS] No user, skipping load');
        return;
      }

      // Use smart refresh logic
      if (shouldRefreshData()) {
        console.log('📱 [LISTS] Triggering data load on focus');
        loadData();
      } else {
        console.log('📱 [LISTS] Data is fresh, skipping load');
      }
      
      return () => {
        console.log('📱 [LISTS] Tab lost focus');
      };
    }, [user, shouldRefreshData, loadData])
  );

  // Handle initial tab selection
  useEffect(() => {
    if (tab) {
      console.log('🔍 [LISTS] Setting initial tab to:', tab);
      const newIndex = tabs.findIndex(route => route.key === tab);
      if (newIndex !== -1) {
        handleTabChange(newIndex);
      }
    }
  }, [tab]);

  if (!user) {
    return null;
  }

  return (
    <View style={edenStyles.container}>
      <Tabs
        routes={tabs}
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
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(35, 77, 44, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#234D2C',
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