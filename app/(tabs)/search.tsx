import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  Platform,
} from 'react-native';
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
  X as XIcon,
  CheckCircle,
  UserPlus,
  Check,
  Flag,
  CircleDot as GolfIcon,
  Users,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { searchCourses, getAllCourses } from '../utils/courses';
import { useDebouncedCallback } from 'use-debounce';
import type { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { getReviewsForUser } from '../utils/reviews';
import { Image } from 'expo-image';
import { searchUsersByName, followUser, unfollowUser, isFollowing } from '../utils/friends';
import { User } from '../types/index';
import { bookmarkService } from '../services/bookmarkService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { Card, Button, BodyText, SmallText, Heading3, FeedbackBadge } from '../components/eden';

// Enhanced Course type with search relevance score
interface EnhancedCourse extends Omit<Course, 'type'> {
  type: string;  // Override the type to be more flexible
  relevanceScore?: number;
}

// Define a custom interface for user search results that matches what Supabase returns
interface UserSearchResult {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
}

// Define the search tab types
type SearchTab = 'courses' | 'members';

// Cache timeouts in milliseconds
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Memoized course item component for better performance
const CourseItem = React.memo(({ 
  course, 
  onPress, 
  isReviewed, 
  isBookmarked, 
  isBookmarkLoading, 
  onBookmarkToggle 
}: { 
  course: EnhancedCourse, 
  onPress: (id: string) => void, 
  isReviewed: boolean, 
  isBookmarked: boolean, 
  isBookmarkLoading: boolean, 
  onBookmarkToggle: (id: string) => void 
}) => {
  const theme = useEdenTheme();
  const [isPressed, setIsPressed] = useState(false);
  
  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(course.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.courseCardWrapper,
        isPressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
      ]}
    >
      <Card
        variant="listItem"
        style={[
          styles.courseCard,
          isPressed && { borderColor: theme.colors.primary, borderWidth: 1 }
        ]}
      >
        <View style={styles.courseItemContent}>
          <View style={styles.courseHeader}>
            <BodyText bold style={styles.courseName}>{course.name}</BodyText>
            
            <View style={styles.headerRightContent}>
              {/* Indicate if user has reviewed this course */}
              {isReviewed && (
                <FeedbackBadge status="positive" label="Played" small />
              )}
              
              {/* Bookmark button */}
              <TouchableOpacity
                style={styles.bookmarkButton}
                onPress={() => onBookmarkToggle(course.id)}
                disabled={isBookmarkLoading}
              >
                {isBookmarkLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : isBookmarked ? (
                  <BookmarkCheck size={20} color={theme.colors.primary} />
                ) : (
                  <Bookmark size={20} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.courseLocation}>
            <MapPin size={14} color={theme.colors.textSecondary} />
            <SmallText color={theme.colors.textSecondary} style={styles.locationText}>
              {course.location || 'Location not available'}
            </SmallText>
          </View>
          
          <View style={styles.courseDetails}>
            {course.par && (
              <View style={[styles.courseDetailChip, { backgroundColor: theme.colors.background }]}>
                <SmallText color={theme.colors.textSecondary}>
                  Par {course.par}
                </SmallText>
              </View>
            )}
            {course.yardage && (
              <View style={[styles.courseDetailChip, { backgroundColor: theme.colors.background }]}>
                <SmallText color={theme.colors.textSecondary}>
                  {course.yardage} yards
                </SmallText>
              </View>
            )}
            {course.type && (
              <View style={[styles.courseDetailChip, { backgroundColor: theme.colors.background }]}>
                <SmallText color={theme.colors.textSecondary}>
                  {course.type}
                </SmallText>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useEdenTheme();
  const { user } = useAuth();
  const { setNeedsRefresh } = usePlayedCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<EnhancedCourse[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SearchTab>(() => {
    // Initialize tab based on URL parameter if present
    return params.tab === 'members' ? 'members' : 'courses';
  });
  const [followingStatus, setFollowingStatus] = useState<{[key: string]: boolean}>({});
  const [followLoading, setFollowLoading] = useState<{[key: string]: boolean}>({});
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState<Set<string>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState<{[key: string]: boolean}>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const coursesListRef = useRef<FlatList>(null);
  const membersListRef = useRef<FlatList>(null);
  
  // Track if we're coming from review success
  const isFromReviewSuccess = params.fromReviewSuccess === 'true';
  
  // Refs to track ongoing requests that might need cancellation
  const loadingOperationsRef = useRef<{cancel?: () => void}>({});
  
  // Add cache state
  const [coursesCache, setCoursesCache] = useState<{
    data: EnhancedCourse[],
    timestamp: number
  } | null>(null);
  
  const [reviewedCoursesCache, setReviewedCoursesCache] = useState<{
    data: Set<string>,
    timestamp: number
  } | null>(null);
  
  const [bookmarkedCoursesCache, setBookmarkedCoursesCache] = useState<{
    data: Set<string>,
    timestamp: number
  } | null>(null);

  // Check if cache is valid
  const isCacheValid = useCallback((cache: { timestamp: number } | null) => {
    return cache && (Date.now() - cache.timestamp < CACHE_EXPIRY);
  }, []);

  const loadReviewedCourses = useCallback(async () => {
    if (!user) return;
    
    // Use cache if valid
    if (isCacheValid(reviewedCoursesCache)) {
      setReviewedCourseIds(reviewedCoursesCache!.data);
      return;
    }
    
    try {
      const reviews = await getReviewsForUser(user.id);
      const reviewedIds = new Set(reviews.map(review => review.course_id));
      setReviewedCourseIds(reviewedIds);
      
      // Update cache
      setReviewedCoursesCache({
        data: reviewedIds,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to load reviewed courses:', err);
    }
  }, [user, reviewedCoursesCache, isCacheValid]);

  const loadBookmarkedCourses = useCallback(async () => {
    if (!user) return;
    
    // Use cache if valid
    if (isCacheValid(bookmarkedCoursesCache)) {
      setBookmarkedCourseIds(bookmarkedCoursesCache!.data);
      return;
    }
    
    try {
      const bookmarkedIds = await bookmarkService.getBookmarkedCourseIds(user.id);
      const bookmarkedSet = new Set(bookmarkedIds);
      setBookmarkedCourseIds(bookmarkedSet);
      
      // Update cache
      setBookmarkedCoursesCache({
        data: bookmarkedSet,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to load bookmarked courses:', err);
    }
  }, [user, bookmarkedCoursesCache, isCacheValid]);

  const loadCourses = useCallback(async (options?: { defer?: boolean }) => {
    // Use cache if valid
    if (isCacheValid(coursesCache)) {
      setCourses(coursesCache!.data);
      return;
    }
    
    // If defer is true, delay loading briefly to allow UI to render first
    if (options?.defer) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    try {
      setLoading(true);
      setError(null);
      const allCourses = await getAllCourses();
      const coursesData = allCourses as EnhancedCourse[];
      setCourses(coursesData);
      
      // Update cache
      setCoursesCache({
        data: coursesData,
        timestamp: Date.now()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [coursesCache, isCacheValid]);

  // Modify the main data loading effect to handle the fromReviewSuccess parameter
  useEffect(() => {
    if (activeTab === 'courses') {
      setInitialLoadComplete(false);
      
      // Load all data in parallel, but defer if coming from review success
      const loadAllData = async () => {
        // Cancel any previous loading operations
        if (loadingOperationsRef.current.cancel) {
          loadingOperationsRef.current.cancel();
        }
        
        const cancelTokens: {cancel?: () => void}[] = [];
        loadingOperationsRef.current = { cancel: () => cancelTokens.forEach(t => t.cancel?.()) };
        
        if (isFromReviewSuccess) {
          // If coming from review success, first show cached data if available
          if (isCacheValid(coursesCache)) {
            setCourses(coursesCache!.data);
          }
          
          // Critical: Ensure UI is responsive even during data loading
          // Mark as initially loaded to enable interaction
          setInitialLoadComplete(true);
          
          // Then defer and load in sequence instead of parallel
          setTimeout(async () => {
            // Use requestAnimationFrame to optimize when we run heavy operations
            requestAnimationFrame(async () => {
              await loadCourses({ defer: true });
              await loadReviewedCourses();
              await loadBookmarkedCourses();
            });
          }, 300);
        } else {
          // Normal flow - load in parallel
          await Promise.all([
            loadCourses(),
            loadReviewedCourses(),
            loadBookmarkedCourses()
          ]);
          setInitialLoadComplete(true);
        }
      };
      
      loadAllData();
      
      // Clean up function
      return () => {
        if (loadingOperationsRef.current.cancel) {
          loadingOperationsRef.current.cancel();
        }
      };
    }
  }, [activeTab, loadCourses, loadReviewedCourses, loadBookmarkedCourses, isFromReviewSuccess, isCacheValid, coursesCache]);
  
  // Add a useEffect to clean the fromReviewSuccess param
  useEffect(() => {
    if (isFromReviewSuccess) {
      // Clear the param after handling it
      const timer = setTimeout(() => {
        router.setParams({});
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isFromReviewSuccess, router]);

  // Check for tab parameter changes
  useEffect(() => {
    if (params.tab === 'members' && activeTab !== 'members') {
      setActiveTab('members');
    }
  }, [params.tab]);

  // Debounce the search to prevent too many API calls
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      if (activeTab === 'courses') {
        loadCourses();
      } else {
        setUsers([]);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'courses') {
        // Get raw search results with scores (we'll keep the smart search but not display stars)
        const results = await searchCourses(query);
        
        // Set courses with their relevance scores (used for sorting)
        if (Array.isArray(results)) {
          if (results.length > 0 && 'relevanceScore' in (results[0] || {})) {
            setCourses(results as EnhancedCourse[]);
          } else {
            const enhancedResults = results.map((course, index) => ({
              ...course,
              relevanceScore: Math.max(100 - (index * 5), 10),
            })) as EnhancedCourse[];
            setCourses(enhancedResults);
          }
        } else {
          setCourses(results as EnhancedCourse[]);
        }
      } else {
        // Search for users
        const results = await searchUsersByName(query);
        
        // Set user results immediately so they show up even if checking following status fails
        setUsers(results as UserSearchResult[]);
        
        // Try to check following status for each user, but don't fail the whole search if this fails
        if (user && results.length > 0) {
          try {
            // Process in batches of 5 for better performance
            const batchSize = 5;
            const batches = Math.ceil(results.length / batchSize);
            let statusMap = {};
            
            for (let i = 0; i < batches; i++) {
              const batchStart = i * batchSize;
              const batchEnd = Math.min((i + 1) * batchSize, results.length);
              const batchResults = results.slice(batchStart, batchEnd);
              
              const batchPromises = batchResults.map(async (result) => {
                try {
                  const status = await isFollowing(user.id, result.id);
                  return { userId: result.id, isFollowing: status };
                } catch (followError) {
                  console.error(`Error checking following status for user ${result.id}:`, followError);
                  return { userId: result.id, isFollowing: false };
                }
              });
              
              const batchStatuses = await Promise.all(batchPromises);
              
              // Update status map
              statusMap = {
                ...statusMap,
                ...batchStatuses.reduce((acc, curr) => {
                  acc[curr.userId] = curr.isFollowing;
                  return acc;
                }, {} as {[key: string]: boolean})
              };
              
              // Update UI after each batch for more responsive feel
              setFollowingStatus(currentStatus => ({
                ...currentStatus,
                ...statusMap
              }));
            }
          } catch (followingError) {
            console.error("Error checking following statuses:", followingError);
          }
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : 'Search failed');
      
      // Clear the results if search failed
      if (activeTab === 'courses') {
        setCourses([]);
      } else {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  }, 300);

  // Call the debounced search when query changes
  useEffect(() => {
    console.log("Search query changed:", searchQuery, "activeTab:", activeTab);
    debouncedSearch(searchQuery);
  }, [searchQuery, activeTab, debouncedSearch]);

  // Add effect to scroll to top when search results change
  useEffect(() => {
    // Ensure the list scrolls to top when results change
    if (activeTab === 'courses' && coursesListRef.current) {
      setTimeout(() => {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50); // Small timeout to ensure the list has updated
    }
  }, [courses, activeTab]);

  // Similar effect for members list
  useEffect(() => {
    if (activeTab === 'members' && membersListRef.current) {
      setTimeout(() => {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    }
  }, [users, activeTab]);

  // Add a ref to track the last pressed course to prevent double clicks
  const lastCoursePress = useRef<{ id: string, time: number } | null>(null);
  
  const handleCoursePress = (courseId: string) => {
    // Prevent rapid multiple presses (debounce)
    const now = Date.now();
    if (lastCoursePress.current && 
        lastCoursePress.current.id === courseId && 
        now - lastCoursePress.current.time < 500) { // Reduced from 1000ms to 500ms for better responsiveness
      console.log('Preventing duplicate course press');
      return;
    }
    
    // Give immediate visual feedback that the press was registered
    // Even if we're still loading data
    Keyboard.dismiss();
    
    // Update last pressed course
    lastCoursePress.current = { id: courseId, time: now };
    
    // Navigate immediately without delay
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId }
    });
  };

  // Handle user card press to navigate to profile
  const handleUserPress = (userId: string, userName?: string) => {
    // Navigate to user profile
    router.push({
      pathname: '/(modals)/user-profile',
      params: { 
        userId, 
        userName: userName || '' 
      }
    });
  };

  const handleCancelPress = () => {
    setSearchQuery('');
    Keyboard.dismiss();
    setIsSearchFocused(false);
    
    if (activeTab === 'courses') {
      loadCourses();
      // Scroll courses list to top after clearing search
      setTimeout(() => {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    } else {
      setUsers([]);
      // Scroll members list to top after clearing search
      setTimeout(() => {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    console.log("Tab changed to:", tab);
    setActiveTab(tab);
    setSearchQuery('');
    setError(null);
    
    if (tab === 'courses') {
      setUsers([]);
      loadCourses();
      // Ensure courses list is at the top
      setTimeout(() => {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    } else {
      setCourses([]);
      // Ensure members list is at the top
      setTimeout(() => {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;
    
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const wasFollowing = followingStatus[userId];
      if (wasFollowing) {
        await unfollowUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
        
        // If we're on the home screen and viewing the friends feed,
        // we'd want to refresh the feed - let the parent handle this
        router.setParams({ followAction: 'unfollow', targetUser: userId });
      } else {
        await followUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
        
        // If we're on the home screen and viewing the friends feed,
        // we'd want to refresh the feed - let the parent handle this
        router.setParams({ followAction: 'follow', targetUser: userId });
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleBookmarkToggle = async (courseId: string) => {
    if (!user) return;
    
    // Set loading state for this course
    setBookmarkLoading(prev => ({ ...prev, [courseId]: true }));
    
    try {
      // Optimistically update UI
      const isCurrentlyBookmarked = bookmarkedCourseIds.has(courseId);
      
      if (isCurrentlyBookmarked) {
        // Remove from bookmarks
        const newBookmarkedIds = new Set(bookmarkedCourseIds);
        newBookmarkedIds.delete(courseId);
        setBookmarkedCourseIds(newBookmarkedIds);
        
        // Call API to remove bookmark
        await bookmarkService.removeBookmark(user.id, courseId);
      } else {
        // Add to bookmarks
        const newBookmarkedIds = new Set(bookmarkedCourseIds);
        newBookmarkedIds.add(courseId);
        setBookmarkedCourseIds(newBookmarkedIds);
        
        // Call API to add bookmark
        await bookmarkService.addBookmark(user.id, courseId);
      }
      
      // Trigger refresh of bookmarks in Lists screen
      setNeedsRefresh();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Revert optimistic update on error
      loadBookmarkedCourses();
    } finally {
      // Clear loading state
      setBookmarkLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Check and refresh the following status for all displayed users when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshFollowingStatus = async () => {
        if (!user || users.length === 0) return;
        
        try {
          const statusPromises = users.map(async (userResult) => {
            const status = await isFollowing(user.id, userResult.id);
            return { userId: userResult.id, isFollowing: status };
          });
          
          const statuses = await Promise.all(statusPromises);
          const statusMap = statuses.reduce((acc, curr) => {
            acc[curr.userId] = curr.isFollowing;
            return acc;
          }, {} as {[key: string]: boolean});
          
          setFollowingStatus(statusMap);
        } catch (error) {
          console.error('Error refreshing following status:', error);
        }
      };
      
      if (activeTab === 'members') {
        refreshFollowingStatus();
      }
    }, [user, users, activeTab])
  );

  // Add this memoized renderItem function before the return statement
  const renderCourseItem = useCallback(({ item }: { item: EnhancedCourse }) => (
    <CourseItem 
      course={item} 
      onPress={handleCoursePress}
      isReviewed={reviewedCourseIds.has(item.id)}
      isBookmarked={bookmarkedCourseIds.has(item.id)}
      isBookmarkLoading={bookmarkLoading[item.id] || false}
      onBookmarkToggle={handleBookmarkToggle}
    />
  ), [reviewedCourseIds, bookmarkedCourseIds, bookmarkLoading, handleCoursePress, handleBookmarkToggle]);

  // Calculate item height based on data for more accurate layout
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 120, // Adjust to match your actual card height
    offset: 120 * index, // Use the same height * index
    index
  }), []);

  // Create a memoized extraction function for optimization
  const keyExtractor = useCallback((item: EnhancedCourse) => item.id, []);

  // Modify the render portion of the component with optimized rendering and indicators
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={[
            styles.inputContainer, 
            { backgroundColor: theme.colors.surface },
            isSearchFocused && [styles.inputContainerActive, {
              borderColor: theme.colors.primary,
              borderWidth: 1
            }]
          ]}>
            <SearchIcon size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text, fontFamily: 'SF Pro Text, -apple-system, sans-serif' }]}
              placeholder="Search courses or members..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onSubmitEditing={() => debouncedSearch(searchQuery)}
              autoCorrect={false}
              spellCheck={false}
            />
            {searchQuery !== '' && (
              <TouchableOpacity style={styles.clearButton} onPress={handleCancelPress}>
                <XIcon size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'courses' && [
                styles.activeTabButton,
                { backgroundColor: `${theme.colors.primary}15` }
              ]
            ]}
            onPress={() => handleTabChange('courses')}
          >
            <GolfIcon
              size={20}
              color={activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <SmallText 
              color={activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary}
              style={styles.tabText}
              bold
            >
              Courses
            </SmallText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'members' && [
                styles.activeTabButton,
                { backgroundColor: `${theme.colors.primary}15` }
              ]
            ]}
            onPress={() => handleTabChange('members')}
          >
            <Users
              size={20}
              color={activeTab === 'members' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <SmallText 
              color={activeTab === 'members' ? theme.colors.primary : theme.colors.textSecondary}
              style={styles.tabText}
              bold
            >
              Members
            </SmallText>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <BodyText color={theme.colors.textSecondary} style={styles.loadingText}>
              {activeTab === 'courses' ? 'Finding courses...' : 'Finding members...'}
            </BodyText>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.centerContainer}>
            <BodyText color={theme.colors.error} style={styles.errorText}>{error}</BodyText>
            <Button 
              label="Retry" 
              variant="primary"
              onPress={() => activeTab === 'courses' ? loadCourses() : debouncedSearch(searchQuery)}
            />
          </View>
        )}

        {/* Empty Search Results - Only show when not loading and we have a query */}
        {!loading && !error && searchQuery.trim() && 
          ((activeTab === 'courses' && courses.length === 0) || 
           (activeTab === 'members' && users.length === 0)) && (
          <View style={styles.centerContainer}>
            <BodyText color={theme.colors.textSecondary} style={styles.noResultsText}>
              No {activeTab === 'courses' ? 'courses' : 'members'} found for "{searchQuery}"
            </BodyText>
          </View>
        )}

        {/* Empty Initial State - Only show when not loading and no query */}
        {!loading && !error && !searchQuery.trim() && activeTab === 'members' && users.length === 0 && (
          <View style={styles.centerContainer}>
            <BodyText color={theme.colors.textSecondary} style={styles.noResultsText}>
              Search for members by name or username
            </BodyText>
          </View>
        )}

        {/* Courses Tab Content */}
        {activeTab === 'courses' && !loading && !error && courses.length > 0 && (
          <FlatList
            key={`courses-${searchQuery}`}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            data={courses}
            keyExtractor={keyExtractor}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            
            getItemLayout={getItemLayout}
            updateCellsBatchingPeriod={50}
            
            ref={coursesListRef}
            
            renderItem={renderCourseItem}
            
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<View style={styles.listFooter} />}
            
            pointerEvents="auto"
            scrollEnabled={true}
          />
        )}

        {/* Members Tab Content */}
        {activeTab === 'members' && !loading && !error && users.length > 0 && (
          <FlatList
            key={`members-${searchQuery}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            data={users}
            keyExtractor={(item) => item.id}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card
                variant="listItem"
                pressable
                onPress={() => handleUserPress(item.id, item.full_name || '')}
                style={styles.userCard}
              >
                <View style={styles.userInfo}>
                  <View style={styles.avatarContainer}>
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: item.avatar_url }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.primary }]}>
                        <BodyText color="#FFFFFF" style={styles.defaultAvatarText}>
                          {(item.full_name?.charAt(0) || item.username?.charAt(0) || '?').toUpperCase()}
                        </BodyText>
                      </View>
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <BodyText bold style={styles.userName}>
                      {item.full_name || 'Anonymous Golfer'}
                    </BodyText>
                    {item.username && (
                      <SmallText color={theme.colors.textSecondary} style={styles.userUsername}>
                        @{item.username}
                      </SmallText>
                    )}
                  </View>
                </View>
                
                {/* Follow/Following Button */}
                {user && user.id !== item.id && (
                  followLoading[item.id] ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Button
                      label={followingStatus[item.id] ? "Following" : "Follow"}
                      variant={followingStatus[item.id] ? "secondary" : "primary"}
                      onPress={() => handleFollow(item.id)}
                      style={styles.followButtonStyle}
                    />
                  )
                )}
              </Card>
            )}
            ListFooterComponent={<View style={styles.listFooter} />}
            ref={membersListRef}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputContainerActive: {
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 24,
  },
  activeTabButton: {
    borderRadius: 24,
  },
  tabText: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  courseCard: {
    marginBottom: 12,
    padding: 0,
  },
  courseItemContent: {
    flex: 1,
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseName: {
    flex: 1,
    marginRight: 8,
  },
  headerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  courseLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 6,
  },
  courseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  courseDetailChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 18,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    marginBottom: 2,
  },
  userUsername: {
  },
  followButtonStyle: {
    minWidth: 100,
  },
  listFooter: {
    height: 20,
  },
  courseCardWrapper: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 2, // Small padding to accommodate pressed state effects
  },
}); 