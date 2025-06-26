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
  InteractionManager,
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
  Plus,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { searchCourses, getAllCourses, getCoursesOrderedByProximity } from '../utils/courses';
import { useDebouncedCallback } from 'use-debounce';
import type { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { getUserLocation } from '../utils/users';
import { CourseSubmissionModal } from '../components/CourseSubmissionModal';

// Helper function to calculate distance between two points using Haversine formula
function getDistanceInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Helper function to extract state from location string
function extractStateFromLocation(location: string | null): string | null {
  if (!location) return null;
  
  // Common patterns: "City, State", "City, State, Country"
  const parts = location.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    const statePart = parts[1];
    // Handle common US state abbreviations and full names
    if (statePart.length === 2) {
      return statePart.toUpperCase(); // State abbreviation like "CA", "NY"
    } else if (statePart.length > 2) {
      return statePart; // Full state name like "California", "New York"
    }
  }
  
  return null;
}
import { getReviewsForUser } from '../utils/reviews';
import { Image } from 'expo-image';
import { searchUsersByName, followUser, unfollowUser, isFollowing } from '../utils/friends';
import { User } from '../types/index';
import { bookmarkService } from '../services/bookmarkService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { Card, Button, BodyText, SmallText, Heading3, FeedbackBadge } from '../components/eden';
import { LazyTabWrapper } from '../components/LazyTabWrapper';
import { useTabLazyLoadingContext } from '../context/TabLazyLoadingContext';
import { useSmartTabFocus } from '../hooks/useSmartTabFocus';

// Enhanced Course type with search relevance score and pre-calculated distance
interface EnhancedCourse extends Omit<Course, 'type'> {
  type: string;  // Override the type to be more flexible
  relevanceScore?: number;
  preCalculatedDistance?: string | null; // Pre-calculate distance to avoid re-computation
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

// Optimized course item component with improved memoization
const CourseItem = React.memo(({ 
  course, 
  onPress, 
  isReviewed, 
  isBookmarked, 
  isBookmarkLoading, 
  onBookmarkToggle,
}: { 
  course: EnhancedCourse, 
  onPress: (id: string) => void, 
  isReviewed: boolean, 
  isBookmarked: boolean, 
  isBookmarkLoading: boolean, 
  onBookmarkToggle: (id: string) => void,
}) => {
  const theme = useEdenTheme();
  const [isPressed, setIsPressed] = useState(false);
  
  // Optimize press handlers with useCallback to prevent re-creation
  const handlePressIn = useCallback(() => setIsPressed(true), []);
  const handlePressOut = useCallback(() => setIsPressed(false), []);
  const handlePress = useCallback(() => onPress(course.id), [onPress, course.id]);
  const handleBookmarkPress = useCallback(() => onBookmarkToggle(course.id), [onBookmarkToggle, course.id]);
  
  // Use pre-calculated distance to avoid expensive computation on every render
  const distance = course.preCalculatedDistance;
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
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
                onPress={handleBookmarkPress}
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
          
          <View style={styles.courseInfoRow}>
            <View style={styles.locationSection}>
              <MapPin size={16} color={theme.colors.textSecondary} />
              <SmallText color={theme.colors.textSecondary} style={styles.locationText}>
                {course.location}
              </SmallText>
            </View>
            
            {distance && (
              <View style={styles.distanceSection}>
                <SmallText color={theme.colors.textSecondary} style={styles.distanceText}>
                  {distance} mi
                </SmallText>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.course.id === nextProps.course.id &&
    prevProps.isReviewed === nextProps.isReviewed &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.isBookmarkLoading === nextProps.isBookmarkLoading &&
    prevProps.course.preCalculatedDistance === nextProps.course.preCalculatedDistance
  );
});

function SearchScreenContent() {
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
  const [courseSubmissionModalVisible, setCourseSubmissionModalVisible] = useState(false);
  const coursesListRef = useRef<FlatList>(null);
  const membersListRef = useRef<FlatList>(null);
  
  // Track if we're coming from review success
  const isFromReviewSuccess = params.fromReviewSuccess === 'true';
  
  // Refs to track ongoing requests that might need cancellation
  const loadingOperationsRef = useRef<{cancel?: () => void, currentSearchId?: number}>({});
  
  // Add ref to throttle status refreshes
  const lastStatusRefresh = useRef<number>(0);
  
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

  // Add state to track ordering method for display
  const [orderingMethod, setOrderingMethod] = useState<'proximity' | 'alphabetical' | 'search'>('alphabetical');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number, state: string} | null>(null);

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

  // Helper function to pre-calculate distances and enhance course data
  const enhanceCoursesWithDistance = useCallback((coursesData: Course[], userLoc?: {latitude: number, longitude: number, state: string} | null): EnhancedCourse[] => {
    return coursesData.map(course => {
      let preCalculatedDistance: string | null = null;
      
      if (userLoc && course.latitude && course.longitude) {
        const dist = getDistanceInMiles(
          userLoc.latitude,
          userLoc.longitude,
          course.latitude,
          course.longitude
        );
        
        // Show "50+" for courses more than 50 miles away
        if (dist > 50) {
          preCalculatedDistance = "50+";
        } else {
          // For nearby courses, show precise distance
          preCalculatedDistance = dist < 10 ? dist.toFixed(1) : Math.round(dist).toString();
        }
      }
      
      return {
        ...course,
        preCalculatedDistance
      } as EnhancedCourse;
    });
  }, []);

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
      
      // Get user location for proximity-based ordering
      let coursesData: Course[] = [];
      let currentUserLocation = userLocation; // Use existing if available
      
      if (user && !currentUserLocation) {
        currentUserLocation = await getUserLocation(user.id);
        if (currentUserLocation) {
          setUserLocation(currentUserLocation);
        }
      }
      
      if (currentUserLocation) {
        // Order courses by proximity to user
        coursesData = await getCoursesOrderedByProximity(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          currentUserLocation.state
        );
        setOrderingMethod('proximity');
        console.log('📍 Search: Loaded courses ordered by proximity to user location');
      } else {
        // Fall back to alphabetical order
        const allCourses = await getAllCourses();
        coursesData = allCourses.sort((a, b) => a.name.localeCompare(b.name));
        setOrderingMethod('alphabetical');
        console.log('📍 Search: No user location found, using alphabetical order');
      }
      
      // Pre-calculate distances for better performance
      const enhancedCoursesData = enhanceCoursesWithDistance(coursesData, currentUserLocation);
      setCourses(enhancedCoursesData);
      
      // Update cache
      setCoursesCache({
        data: enhancedCoursesData,
        timestamp: Date.now()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [coursesCache, isCacheValid, user, userLocation, enhanceCoursesWithDistance]);

  // Optimized data loading - cache courses, only refresh status
  useEffect(() => {
    if (activeTab === 'courses' && !initialLoadComplete) {
      const loadAllData = async () => {
        console.log('🔄 Search: Loading course data...');
        
        // Cancel any previous loading operations
        if (loadingOperationsRef.current.cancel) {
          loadingOperationsRef.current.cancel();
        }
        
        const cancelTokens: {cancel?: () => void}[] = [];
        loadingOperationsRef.current = { cancel: () => cancelTokens.forEach(t => t.cancel?.()) };
        
        try {
          // Always load courses first (uses cache if available)
          await loadCourses();
          
          if (isFromReviewSuccess) {
            console.log('💾 Search: Coming from review - only refreshing status data');
            // Only refresh the status data, not the courses themselves
            setInitialLoadComplete(true);
            
            // Refresh status data in background without blocking UI
            setTimeout(() => {
              Promise.all([
                loadReviewedCourses(),
                loadBookmarkedCourses()
              ]).then(() => {
                console.log('✅ Search: Status data refreshed');
              }).catch(error => {
                console.error('❌ Search: Error refreshing status data:', error);
              });
            }, 100);
          } else {
            console.log('🚀 Search: Normal load - getting status data');
            // Normal flow - load status data
            await Promise.all([
              loadReviewedCourses(),
              loadBookmarkedCourses()
            ]);
            setInitialLoadComplete(true);
          }
        } catch (error) {
          console.error('❌ Search: Error loading data:', error);
          setInitialLoadComplete(true); // Still set to true to prevent infinite loading
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
  }, [activeTab, initialLoadComplete]); // Removed function dependencies to prevent loops
  
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

  // Optimize search with better performance patterns
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    // Create a cancellation token for this search operation
    const searchId = Date.now();
    loadingOperationsRef.current.currentSearchId = searchId;

    if (!query.trim()) {
      if (activeTab === 'courses') {
        // Use proximity-based loading when no search query
        setOrderingMethod(userLocation ? 'proximity' : 'alphabetical');
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
        // Get raw search results with scores
        const results = await searchCourses(query);
        
        // Check if this search is still current
        if (loadingOperationsRef.current.currentSearchId !== searchId) {
          console.log('Search cancelled - newer search in progress');
          return;
        }
        
        setOrderingMethod('search');
        
        // Pre-calculate distances and enhance results
        let enhancedResults: EnhancedCourse[];
        
        if (Array.isArray(results)) {
          if (results.length > 0 && 'relevanceScore' in (results[0] || {})) {
            enhancedResults = enhanceCoursesWithDistance(results as Course[], userLocation);
          } else {
            const withScores = results.map((course, index) => ({
              ...course,
              relevanceScore: Math.max(100 - (index * 5), 10),
            }));
            enhancedResults = enhanceCoursesWithDistance(withScores as Course[], userLocation);
          }
        } else {
          enhancedResults = enhanceCoursesWithDistance([results] as Course[], userLocation);
        }
        
        // Final check before setting state
        if (loadingOperationsRef.current.currentSearchId === searchId) {
          setCourses(enhancedResults);
        }
      } else {
        // Search for users with improved batching
        const results = await searchUsersByName(query);
        
        // Check if search is still current
        if (loadingOperationsRef.current.currentSearchId !== searchId) {
          return;
        }
        
        // Set user results immediately
        setUsers(results as UserSearchResult[]);
        
        // Async follow status checking with better performance
        if (user && results.length > 0) {
          // Use InteractionManager to defer non-critical work
          InteractionManager.runAfterInteractions(async () => {
            try {
              // Process in smaller batches for better UX
              const batchSize = 3;
              const statusUpdates: {[key: string]: boolean} = {};
              
              for (let i = 0; i < results.length; i += batchSize) {
                // Check if search is still current
                if (loadingOperationsRef.current.currentSearchId !== searchId) {
                  return;
                }
                
                const batch = results.slice(i, i + batchSize);
                const batchPromises = batch.map(async (result) => {
                  try {
                    const status = await isFollowing(user.id, result.id);
                    return { userId: result.id, isFollowing: status };
                  } catch (error) {
                    console.error(`Error checking following status for user ${result.id}:`, error);
                    return { userId: result.id, isFollowing: false };
                  }
                });
                
                const batchResults = await Promise.all(batchPromises);
                
                // Accumulate results
                batchResults.forEach(({ userId, isFollowing }) => {
                  statusUpdates[userId] = isFollowing;
                });
                
                // Update UI in larger batches for better performance
                if (Object.keys(statusUpdates).length >= batchSize || i + batchSize >= results.length) {
                  setFollowingStatus(current => ({ ...current, ...statusUpdates }));
                  // Clear accumulated updates
                  Object.keys(statusUpdates).forEach(key => delete statusUpdates[key]);
                }
              }
            } catch (error) {
              console.error("Error checking following statuses:", error);
            }
          });
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      
      // Only update state if this search is still current
      if (loadingOperationsRef.current.currentSearchId === searchId) {
        setError(err instanceof Error ? err.message : 'Search failed');
        
        if (activeTab === 'courses') {
          setCourses([]);
        } else {
          setUsers([]);
        }
      }
    } finally {
      // Only update loading state if this search is still current
      if (loadingOperationsRef.current.currentSearchId === searchId) {
        setLoading(false);
      }
    }
  }, 300);

  // Optimized single effect for search and scroll management
  useEffect(() => {
    console.log("Search query changed:", searchQuery, "activeTab:", activeTab);
    debouncedSearch(searchQuery);
    
    // Use InteractionManager for smooth scroll operations
    InteractionManager.runAfterInteractions(() => {
      if (activeTab === 'courses' && coursesListRef.current) {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: false });
      } else if (activeTab === 'members' && membersListRef.current) {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    });
  }, [searchQuery, activeTab, debouncedSearch]);

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

  const handleCancelPress = useCallback(() => {
    // Cancel any ongoing operations
    if (loadingOperationsRef.current.cancel) {
      loadingOperationsRef.current.cancel();
    }
    
    setSearchQuery('');
    Keyboard.dismiss();
    setIsSearchFocused(false);
    setError(null);
    
    if (activeTab === 'courses') {
      loadCourses();
      // Use InteractionManager for smooth scrolling
      InteractionManager.runAfterInteractions(() => {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    } else {
      setUsers([]);
      InteractionManager.runAfterInteractions(() => {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [activeTab, loadCourses]);

  // Handler for opening course submission modal
  const handleSubmitCourse = useCallback(() => {
    setCourseSubmissionModalVisible(true);
  }, []);

  const handleTabChange = useCallback((tab: SearchTab) => {
    if (tab === activeTab) return; // Prevent unnecessary state changes
    
    console.log("Tab changed to:", tab);
    
    // Cancel any ongoing operations
    if (loadingOperationsRef.current.cancel) {
      loadingOperationsRef.current.cancel();
    }
    
    setActiveTab(tab);
    setSearchQuery('');
    setError(null);
    setLoading(false);
    
    if (tab === 'courses') {
      setUsers([]);
      setFollowingStatus({});
      loadCourses();
      InteractionManager.runAfterInteractions(() => {
        coursesListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    } else {
      setCourses([]);
      setBookmarkLoading({});
      InteractionManager.runAfterInteractions(() => {
        membersListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [activeTab, loadCourses]);

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
      
      let newBookmarkedIds: Set<string>;
      
      if (isCurrentlyBookmarked) {
        // Remove from bookmarks
        newBookmarkedIds = new Set(bookmarkedCourseIds);
        newBookmarkedIds.delete(courseId);
        setBookmarkedCourseIds(newBookmarkedIds);
        
        // Call API to remove bookmark
        await bookmarkService.removeBookmark(user.id, courseId);
      } else {
        // Add to bookmarks
        newBookmarkedIds = new Set(bookmarkedCourseIds);
        newBookmarkedIds.add(courseId);
        setBookmarkedCourseIds(newBookmarkedIds);
        
        // Call API to add bookmark
        await bookmarkService.addBookmark(user.id, courseId);
      }
      
      // Update the cache with the new state immediately
      setBookmarkedCoursesCache({
        data: newBookmarkedIds,
        timestamp: Date.now()
      });
      
      // Trigger refresh of bookmarks in Lists screen
      setNeedsRefresh();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Invalidate cache and reload from server on error
      setBookmarkedCoursesCache(null);
      loadBookmarkedCourses();
    } finally {
      // Clear loading state
      setBookmarkLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Smart focus effect - only refresh status data, not courses
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Search tab focused');
      
      const refreshStatusData = async () => {
        if (activeTab === 'courses') {
          // For courses tab, only refresh played/bookmarked status
          console.log('🔄 Search: Refreshing course status data only');
          try {
            await Promise.all([
              loadReviewedCourses(),
              loadBookmarkedCourses()
            ]);
            console.log('✅ Search: Course status refreshed');
          } catch (error) {
            console.error('Error refreshing course status:', error);
          }
        } else if (activeTab === 'members' && users.length > 0) {
          // For members tab, refresh following status
          console.log('🔄 Search: Refreshing following status');
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
            console.log('✅ Search: Following status refreshed');
          } catch (error) {
            console.error('Error refreshing following status:', error);
          }
        }
      };
      
      // Throttle to prevent excessive refreshes, but allow immediate refresh after bookmark changes
      const now = Date.now();
      const timeSinceLastRefresh = now - (lastStatusRefresh.current || 0);
      
      // Always refresh if cache is invalid (e.g., after bookmark changes)
      const shouldForceRefresh = !isCacheValid(bookmarkedCoursesCache) || !isCacheValid(reviewedCoursesCache);
      
      if (timeSinceLastRefresh > 3000 || shouldForceRefresh) { // 3 second throttle or forced refresh
        lastStatusRefresh.current = now;
        refreshStatusData();
      } else {
        console.log(`⏭️ Search: Skipping status refresh - too soon (${timeSinceLastRefresh}ms)`);
      }
    }, [activeTab, users.length, user, loadReviewedCourses, loadBookmarkedCourses, bookmarkedCoursesCache, reviewedCoursesCache, isCacheValid])
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
            {activeTab === 'courses' && (
              <TouchableOpacity style={styles.submitCourseButton} onPress={handleSubmitCourse}>
                <Plus size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
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
            {activeTab === 'courses' ? (
              <View style={styles.noCoursesContainer}>
                <MapPin size={48} color={theme.colors.textSecondary} style={styles.noCoursesIcon} />
                <BodyText color={theme.colors.textSecondary} style={styles.noResultsText}>
                  No courses found for "{searchQuery}"
                </BodyText>
                <SmallText color={theme.colors.textSecondary} style={styles.submitCourseHelpText}>
                  Can't find the course you're looking for?
                </SmallText>
                <Button 
                  label="Submit Missing Course" 
                  variant="primary"
                  onPress={handleSubmitCourse}
                  style={styles.submitCourseEmptyButton}
                />
              </View>
            ) : (
              <BodyText color={theme.colors.textSecondary} style={styles.noResultsText}>
                No members found for "{searchQuery}"
              </BodyText>
            )}
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
            
            // Optimized rendering performance
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={10}
            removeClippedSubviews={true}
            disableVirtualization={false}
            
            // Improved layout and batching
            getItemLayout={getItemLayout}
            updateCellsBatchingPeriod={16} // 60fps
            
            // Performance optimizations
            legacyImplementation={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10
            }}
            
            ref={coursesListRef}
            renderItem={renderCourseItem}
            
            ListHeaderComponent={
              !searchQuery.trim() ? (
                <View style={styles.orderingHeader}>
                  <SmallText color={theme.colors.textSecondary} style={styles.orderingText}>
                    {orderingMethod === 'proximity' ? '📍 Courses near you' : '🏌️ All courses (A-Z)'}
                  </SmallText>
                </View>
              ) : null
            }
            
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<View style={styles.listFooter} />}
            
            // Scroll optimizations
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            overScrollMode="auto"
            decelerationRate="normal"
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
            
            // Optimized rendering performance
            initialNumToRender={10}
            maxToRenderPerBatch={6}
            windowSize={8}
            removeClippedSubviews={true}
            disableVirtualization={false}
            updateCellsBatchingPeriod={16}
            
            // Scroll optimizations
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            
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

        {/* Course Submission Modal */}
        <CourseSubmissionModal
          visible={courseSubmissionModalVisible}
          onClose={() => setCourseSubmissionModalVisible(false)}
        />
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
  submitCourseButton: {
    padding: 4,
    marginLeft: 8,
    marginRight: 4,
  },
  noCoursesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noCoursesIcon: {
    marginBottom: 16,
  },
  submitCourseHelpText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitCourseEmptyButton: {
    minWidth: 200,
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
      courseInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    locationSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    locationText: {
      marginLeft: 6,
      flex: 1,
    },
    distanceSection: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginLeft: 8,
    },
    distanceText: {
      fontSize: 12,
      fontWeight: '500',
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
  orderingHeader: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginBottom: 8,
  },
  orderingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// Export the lazy-loaded version
export default function SearchScreen() {
  const { isTabActivated, markTabAsActivated } = useTabLazyLoadingContext();
  const tabName = 'search';
  
  const handleFirstActivation = () => {
    console.log('🚀 Search tab: First activation - will load course data');
    markTabAsActivated(tabName);
  };
  
  // Always mark as activated when the screen mounts to fix loading issues
  React.useEffect(() => {
    markTabAsActivated(tabName);
  }, [markTabAsActivated, tabName]);
  
  return (
    <LazyTabWrapper
      isActive={true} // This tab is controlled by the navigation
      hasBeenActive={true} // Force to true to prevent loading screen issues
      onFirstActivation={handleFirstActivation}
      tabName="Search"
    >
      <SearchScreenContent />
    </LazyTabWrapper>
  );
} 