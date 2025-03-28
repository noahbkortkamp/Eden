import React, { useState, useEffect, useCallback, useReducer, memo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FriendReviewCard } from './FriendReviewCard';
import { getFriendsReviews } from '../utils/friends';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users } from 'lucide-react-native';
import { supabase } from '../utils/supabase';

// How long to keep cache valid (in milliseconds)
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // Increased to 15 minutes for better performance
const CACHE_KEY = 'friendsReviewsCache';

// Define reducer state and actions
type ReviewsState = {
  reviews: any[];
  loading: boolean;
  refreshing: boolean;
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;
};

type ReviewsAction =
  | { type: 'FETCH_START'; refresh?: boolean }
  | { type: 'FETCH_SUCCESS'; data: any[]; isFirstPage: boolean; hasMore: boolean }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'LOAD_MORE_START' }
  | { type: 'ADD_REAL_TIME_REVIEW'; review: any }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'RESET_ERROR' };

// Initial state
const initialState: ReviewsState = {
  reviews: [],
  loading: true,
  refreshing: false,
  page: 1,
  hasMore: true,
  isLoadingMore: false,
  error: null,
};

// Helper function to deduplicate reviews
const deduplicateReviews = (reviews: any[]): any[] => {
  const uniqueMap = new Map();
  
  // Use a Map to keep only unique reviews by ID
  reviews.forEach(review => {
    // Create a composite key for uniqueness checking
    const uniqueKey = `${review.id}-${review.user_id}-${review.course_id}`;
    
    // Only add if we haven't seen this key yet
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, review);
    }
  });
  
  // Convert back to array
  return Array.from(uniqueMap.values());
};

// Reducer function
function reviewsReducer(state: ReviewsState, action: ReviewsAction): ReviewsState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: !state.refreshing && state.page === 1,
        refreshing: !!action.refresh,
        error: null,
      };
    case 'FETCH_SUCCESS': {
      // Create new reviews array based on whether this is first page or not
      const newReviews = action.isFirstPage 
        ? action.data 
        : [...state.reviews, ...action.data];
      
      // Deduplicate the reviews
      const uniqueReviews = deduplicateReviews(newReviews);
      
      return {
        ...state,
        reviews: uniqueReviews,
        loading: false,
        refreshing: false,
        isLoadingMore: false,
        hasMore: action.hasMore,
        error: null,
      };
    }
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        refreshing: false,
        isLoadingMore: false,
        error: action.error,
      };
    case 'LOAD_MORE_START':
      return {
        ...state,
        isLoadingMore: true,
      };
    case 'ADD_REAL_TIME_REVIEW': {
      // Create a unique key for the new review
      const newReviewKey = `${action.review.id}-${action.review.user_id}-${action.review.course_id}`;
      
      // Check if this review already exists in our state
      for (const existingReview of state.reviews) {
        const existingKey = `${existingReview.id}-${existingReview.user_id}-${existingReview.course_id}`;
        if (existingKey === newReviewKey) {
          // This is a duplicate - don't add it again
          return state;
        }
      }
      
      // Add the new review at the beginning of the array
      return {
        ...state,
        reviews: [action.review, ...state.reviews],
      };
    }
    case 'SET_PAGE':
      return {
        ...state,
        page: action.page,
      };
    case 'RESET_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface FriendsReviewsFeedProps {
  onFindFriendsPress: () => void;
}

// Memoized FriendReviewCard component
const MemoizedFriendReviewCard = memo(FriendReviewCard);

export const FriendsReviewsFeed: React.FC<FriendsReviewsFeedProps> = memo(({ onFindFriendsPress }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reviewsReducer, initialState);
  
  // More efficient caching strategy
  const loadCachedData = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { timestamp, data, version } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
        
        if (!isExpired && Array.isArray(data) && data.length > 0) {
          // Use cached data while fetching fresh data in background
          dispatch({ type: 'FETCH_SUCCESS', data, isFirstPage: true, hasMore: true });
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error loading cached data:', err);
      return false;
    }
  }, []);
  
  // Update cache with new data
  const updateCache = useCallback(async (data: any[]) => {
    if (data.length > 0) {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data,
          version: '1.0',
        }));
      } catch (err) {
        console.error('Error updating cache:', err);
      }
    }
  }, []);
  
  // Fetch reviews with proper memoization
  const fetchReviews = useCallback(async (refresh = false) => {
    if (!user) return;
    
    const currentPage = refresh ? 1 : state.page;
    const pageSize = 10;
    
    // Set loading states
    dispatch({ type: 'FETCH_START', refresh });
    
    try {
      // Stale-while-revalidate pattern: load cache first, then fetch fresh data
      if (currentPage === 1 && !refresh) {
        const hasCachedData = await loadCachedData();
        if (hasCachedData) {
          // If we have cached data, refresh in background
          fetchFreshData(currentPage, pageSize, true);
          return;
        }
      }
      
      await fetchFreshData(currentPage, pageSize);
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', error: 'Failed to load reviews' });
    }
  }, [user, state.page, loadCachedData, updateCache]);
  
  // Function to fetch fresh data from API
  const fetchFreshData = async (currentPage: number, pageSize: number, isBackground = false) => {
    try {
      // Only show loading indicator if not background refresh
      if (!isBackground && currentPage > 1) {
        dispatch({ type: 'LOAD_MORE_START' });
      }
      
      const reviewsData = await getFriendsReviews(user!.id, currentPage, pageSize);
      
      // Update state with new data
      const isFirstPage = currentPage === 1;
      const hasMore = reviewsData.length === pageSize;
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        data: reviewsData, 
        isFirstPage, 
        hasMore 
      });
      
      // Update cache for first page data
      if (isFirstPage) {
        updateCache(reviewsData);
      }
    } catch (err) {
      console.error('Error in fetchFreshData:', err);
      if (!isBackground) {
        // Provide a user-friendly error message
        let errorMessage = 'Failed to load reviews';
        
        if (err && typeof err === 'object' && 'message' in err) {
          // If there's a specific error message, use it
          errorMessage = `Error loading reviews: ${err.message}`;
        }
        
        dispatch({ type: 'FETCH_ERROR', error: errorMessage });
      }
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to real-time updates for followed users' reviews
    const subscription = supabase
      .channel('followed_users_reviews')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
        },
        async (payload) => {
          try {
            // Check if the review is from someone the user follows
            const { data, error } = await supabase
              .from('followed_users_reviews')
              .select('*')
              .eq('id', payload.new.id)
              .eq('follower_id', user.id);
              
            if (!error && data && data.length > 0) {
              // Add new review to the feed
              dispatch({ type: 'ADD_REAL_TIME_REVIEW', review: data[0] });
              
              // Update cache to include the new review
              const cachedData = await AsyncStorage.getItem(CACHE_KEY);
              if (cachedData) {
                const { timestamp, data: cachedReviews, version } = JSON.parse(cachedData);
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                  timestamp,
                  data: [data[0], ...cachedReviews],
                  version,
                }));
              }
            }
          } catch (err) {
            console.error('Error processing real-time update:', err);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);
  
  // Function to handle "load more" when reaching the end of the list
  const handleLoadMore = useCallback(() => {
    if (!state.isLoadingMore && state.hasMore) {
      dispatch({ type: 'SET_PAGE', page: state.page + 1 });
      fetchReviews();
    }
  }, [state.isLoadingMore, state.hasMore, state.page, fetchReviews]);
  
  // Handle refresh (called when user pulls to refresh)
  const handleRefresh = useCallback(() => {
    dispatch({ type: 'SET_PAGE', page: 1 });
    fetchReviews(true);
  }, [fetchReviews]);
  
  // Handle review press
  const handleReviewPress = useCallback((courseId: string) => {
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId }
    });
  }, [router]);
  
  // Create a more robust key extractor function
  const getUniqueKey = useCallback((item: any, index: number) => {
    // Create a normalized timestamp by removing special characters
    const timestamp = item.created_at ? 
      item.created_at.replace(/[-:\.]/g, '').replace(/[^a-zA-Z0-9]/g, '') : 
      Date.now().toString();
    
    // Combine id, timestamp and index for maximum uniqueness
    return `review-${item.id || 'unknown'}-${timestamp}-${index}`;
  }, []);
  
  // Rendering logic based on state
  if (state.loading && !state.refreshing && !state.isLoadingMore) {
    return (
      <View style={[styles.fillContainer, styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (state.error) {
    return (
      <View style={[styles.fillContainer, styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{state.error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} 
          onPress={() => fetchReviews(true)}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (state.reviews.length === 0 && !state.loading) {
    return (
      <View style={[styles.fillContainer, styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Users size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No Friend Reviews Yet
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
          Follow friends to see their reviews here
        </Text>
        <TouchableOpacity 
          style={[styles.findFriendsButton, { backgroundColor: theme.colors.primary }]}
          onPress={onFindFriendsPress}
        >
          <Text style={[styles.findFriendsButtonText, { color: theme.colors.white }]}>
            Find Friends
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={state.reviews}
      renderItem={({ item, index }) => (
        <MemoizedFriendReviewCard
          review={item} 
          onPress={() => handleReviewPress(item.course_id)}
        />
      )}
      keyExtractor={getUniqueKey}
      contentContainerStyle={styles.container}
      style={styles.flatList}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshing={state.refreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={10}
      getItemLayout={(data, index) => (
        { length: 220, offset: 220 * index, index }
      )}
      ListFooterComponent={
        state.isLoadingMore ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadMoreIndicator} />
        ) : state.hasMore ? (
          <TouchableOpacity 
            style={styles.loadMoreButton} 
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        ) : state.reviews.length > 0 ? (
          <Text style={styles.endOfListText}>You've reached the end</Text>
        ) : null
      }
    />
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  flatList: {
    flex: 1,
    marginTop: 2, // Small margin to create slight separation from tabs
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
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  findFriendsButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  findFriendsButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#0066ff',
  },
  endOfListText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  fillContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
}); 