import React, { useState, useCallback, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { searchCourses, getAllCourses } from '../utils/courses';
import { useDebouncedCallback } from 'use-debounce';
import type { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { getReviewsForUser } from '../utils/reviews';
import { Image } from 'expo-image';
import { searchUsersByName, followUser, unfollowUser, isFollowing } from '../utils/friends';
import { User } from '../types/index';
import { bookmarkService } from '../services/bookmarkService';

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

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<EnhancedCourse[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SearchTab>('courses');
  const [followingStatus, setFollowingStatus] = useState<{[key: string]: boolean}>({});
  const [followLoading, setFollowLoading] = useState<{[key: string]: boolean}>({});
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState<Set<string>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState<{[key: string]: boolean}>({});

  const loadReviewedCourses = async () => {
    if (!user) return;
    try {
      const reviews = await getReviewsForUser(user.id);
      setReviewedCourseIds(new Set(reviews.map(review => review.course_id)));
    } catch (err) {
      console.error('Failed to load reviewed courses:', err);
    }
  };

  const loadBookmarkedCourses = async () => {
    if (!user) return;
    try {
      const bookmarkedIds = await bookmarkService.getBookmarkedCourseIds(user.id);
      setBookmarkedCourseIds(new Set(bookmarkedIds));
    } catch (err) {
      console.error('Failed to load bookmarked courses:', err);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const allCourses = await getAllCourses();
      setCourses(allCourses as EnhancedCourse[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Load courses, reviews, and bookmarks when component mounts
  useEffect(() => {
    if (activeTab === 'courses') {
      loadCourses();
      loadReviewedCourses();
      loadBookmarkedCourses();
    }
  }, [user, activeTab]);

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
            const statusPromises = results.map(async (result) => {
              try {
                const status = await isFollowing(user.id, result.id);
                return { userId: result.id, isFollowing: status };
              } catch (followError) {
                console.error(`Error checking following status for user ${result.id}:`, followError);
                return { userId: result.id, isFollowing: false };
              }
            });
            
            const statuses = await Promise.all(statusPromises);
            const statusMap = statuses.reduce((acc, curr) => {
              acc[curr.userId] = curr.isFollowing;
              return acc;
            }, {} as {[key: string]: boolean});
            
            setFollowingStatus(statusMap);
          } catch (followingError) {
            console.error("Error checking following statuses:", followingError);
            // Don't set error state - we still want to show results even if follow status fails
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

  const handleCoursePress = (courseId: string) => {
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId }
    });
  };

  const handleCancelPress = () => {
    setSearchQuery('');
    Keyboard.dismiss();
    setIsSearchFocused(false);
    
    if (activeTab === 'courses') {
      loadCourses();
    } else {
      setUsers([]);
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
    } else {
      setCourses([]);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;
    
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      if (followingStatus[userId]) {
        await unfollowUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
      } else {
        await followUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
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
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Revert optimistic update on error
      loadBookmarkedCourses();
    } finally {
      // Clear loading state
      setBookmarkLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <View style={[styles.userItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
            <Text style={styles.avatarText}>
              {(item.full_name || item.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userTextInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {item.full_name || item.username || 'User'}
          </Text>
          {item.username && item.full_name && (
            <Text style={[styles.userUsername, { color: theme.colors.textSecondary }]}>
              @{item.username}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          followingStatus[item.id]
            ? { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success }
            : { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
        ]}
        onPress={() => handleFollow(item.id)}
        disabled={followLoading[item.id]}
      >
        {followLoading[item.id] ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : followingStatus[item.id] ? (
          <Check size={16} color={theme.colors.success} />
        ) : (
          <UserPlus size={16} color={theme.colors.primary} />
        )}
        <Text
          style={[
            styles.followButtonText,
            {
              color: followingStatus[item.id]
                ? theme.colors.success
                : theme.colors.primary
            }
          ]}
        >
          {followingStatus[item.id] ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Search</Text>
        
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.searchRow}>
            <SearchIcon size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={activeTab === 'courses' ? "Search courses..." : "Search people..."}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={handleCancelPress} style={styles.cancelButton}>
                <XIcon size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : isSearchFocused ? (
              <TouchableOpacity onPress={handleCancelPress} style={styles.cancelButton}>
                <Text style={[styles.cancelText, { color: theme.colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'courses' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]
            ]}
            onPress={() => handleTabChange('courses')}
          >
            <GolfIcon 
              size={16} 
              color={activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary} 
              style={styles.tabIcon} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary }
              ]}
            >
              Courses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'members' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]
            ]}
            onPress={() => handleTabChange('members')}
          >
            <Users 
              size={16} 
              color={activeTab === 'members' ? theme.colors.primary : theme.colors.textSecondary} 
              style={styles.tabIcon} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: activeTab === 'members' ? theme.colors.primary : theme.colors.textSecondary }
              ]}
            >
              Members
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        ) : activeTab === 'courses' ? (
          // Courses View
          <ScrollView 
            style={styles.resultsContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
              {searchQuery ? 'Search Results' : 'All Courses'}
            </Text>
            
            {courses.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No courses found
              </Text>
            ) : (
              courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.courseItem, { backgroundColor: theme.colors.surface }]}
                  onPress={() => handleCoursePress(course.id)}
                >
                  <View style={styles.courseInfo}>
                    <Text style={[styles.courseName, { color: theme.colors.text }]}>
                      {course.name}
                    </Text>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color={theme.colors.textSecondary} style={styles.locationIcon} />
                      <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
                        {course.location}
                      </Text>
                    </View>
                    <View style={styles.courseDetails}>
                      <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                        Par {course.par || 72}
                      </Text>
                      <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                        {course.yardage || 6800} yards
                      </Text>
                      <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                        {course.type || 'public'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.courseActions}>
                    {reviewedCourseIds.has(course.id) && (
                      <CheckCircle size={24} color={theme.colors.success} style={styles.actionIcon} />
                    )}
                    <TouchableOpacity
                      style={styles.bookmarkButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleBookmarkToggle(course.id);
                      }}
                      disabled={bookmarkLoading[course.id]}
                    >
                      {bookmarkLoading[course.id] ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : bookmarkedCourseIds.has(course.id) ? (
                        <BookmarkCheck size={24} color={theme.colors.primary} />
                      ) : (
                        <Bookmark size={24} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : (
          // Members View
          <View style={styles.resultsContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {error}
                </Text>
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => debouncedSearch(searchQuery)}
                >
                  <Text style={[styles.retryButtonText, { color: theme.colors.background }]}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : users.length === 0 && searchQuery ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No users found matching '{searchQuery}'
              </Text>
            ) : !searchQuery ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Search for golfers by name
              </Text>
            ) : (
              <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.usersList}
              />
            )}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    height: 24,
  },
  cancelButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
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
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  courseInfo: {
    flex: 1,
    marginRight: 8,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 8,
  },
  bookmarkButton: {
    padding: 4,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    marginRight: 4,
  },
  courseLocation: {
    fontSize: 14,
  },
  courseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 14,
    marginRight: 12,
  },
  usersList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  userTextInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: 14,
    fontWeight: '400',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 