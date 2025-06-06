import React, { useState, useEffect, useCallback, useReducer, memo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme, useEdenTheme } from '../theme/ThemeProvider';
import { SimpleFriendReviewCard } from './SimpleFriendReviewCard';
import { getFriendsReviews } from '../utils/friends';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { colors } from '../theme/tokens';
import { Heading2, BodyText, Button, EmptyTabState } from '../components/eden';

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

// Define the ref interface
export interface FriendsReviewsFeedRef {
  handleRefresh: () => void;
}

// Memoized FriendReviewCard component
const MemoizedFriendReviewCard = memo(SimpleFriendReviewCard);

// Convert to forwardRef
export const FriendsReviewsFeed = forwardRef<FriendsReviewsFeedRef, FriendsReviewsFeedProps>((props, ref) => {
  const { onFindFriendsPress } = props;
  const theme = useTheme();
  const edenTheme = useEdenTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reviewsReducer, initialState);
  // Add a ref to store the current state for use in subscriptions
  const stateRef = useRef(state);
  
  // Update ref whenever state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
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
      
      console.log(`Fetching friends reviews for page ${currentPage}, background=${isBackground}`);
      
      try {
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
        // Handle error from getFriendsReviews
        console.error('Error in getFriendsReviews:', err);
        
        if (!isBackground) {
          // Try once more with a simplified approach if there was an error
          if (err instanceof TypeError && err.toString().includes('is not a function')) {
            console.warn('Encountered TypeError, switching to fallback method');
            // No need to implement fallback here as we've fixed the underlying issue
          }
          
          // Show user-friendly error
          let errorMessage = 'Failed to load reviews';
          
          if (err && typeof err === 'object') {
            if ('message' in err) {
              errorMessage = `Error loading reviews: ${err.message}`;
            } else if (err instanceof TypeError) {
              errorMessage = 'We encountered a data loading issue. Please try again later.';
            }
          }
          
          dispatch({ type: 'FETCH_ERROR', error: errorMessage });
        }
      }
    } catch (err) {
      console.error('Unexpected error in fetchFreshData:', err);
      
      if (!isBackground) {
        dispatch({ type: 'FETCH_ERROR', error: 'An unexpected error occurred' });
      }
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  
  // Handle refresh (called when user pulls to refresh)
  const handleRefresh = useCallback(() => {
    dispatch({ type: 'SET_PAGE', page: 1 });
    fetchReviews(true);
  }, [fetchReviews]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleRefresh
  }));
  
  // Stable refresh function that doesn't depend on handleRefresh
  const refreshFeed = useCallback(() => {
    dispatch({ type: 'SET_PAGE', page: 1 });
    fetchReviews(true);
  }, [fetchReviews]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to real-time updates for followed users' reviews
    const reviewsSubscription = supabase
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
      
    // Add subscription for follows table to refresh the feed when user follows someone new
    const followsSubscription = supabase
      .channel('user_follows')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
        },
        async (payload) => {
          try {
            // Only refresh if the current user is the one following
            if (payload.new && payload.new.follower_id === user.id) {
              console.log('User followed someone new, refreshing feed');
              // Use refreshFeed instead of handleRefresh to avoid dependency issues
              refreshFeed();
            }
          } catch (err) {
            console.error('Error processing follow update:', err);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(reviewsSubscription);
      supabase.removeChannel(followsSubscription);
    };
  }, [user, refreshFeed]);
  
  // Function to handle "load more" when reaching the end of the list
  const handleLoadMore = useCallback(() => {
    if (!state.isLoadingMore && state.hasMore) {
      dispatch({ type: 'SET_PAGE', page: state.page + 1 });
      fetchReviews();
    }
  }, [state.isLoadingMore, state.hasMore, state.page, fetchReviews]);
  
  // Handle review press
  const handleReviewPress = useCallback((review: any) => {
    if (!review || !review.id) return;
    
    router.push({
      pathname: '/review/friend-detail',
      params: { reviewId: review.id }
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
      <View style={[styles.fillContainer, styles.loadingContainer, { backgroundColor: edenTheme.colors.background }]}>
        <ActivityIndicator size="large" color={edenTheme.colors.primary} />
      </View>
    );
  }
  
  if (state.error) {
    return (
      <View style={[styles.fillContainer, styles.errorContainer, { backgroundColor: edenTheme.colors.background }]}>
        <BodyText color={edenTheme.colors.error} style={styles.errorText}>{state.error}</BodyText>
        <Button
          label="Retry"
          variant="primary"
          onPress={() => fetchReviews(true)}
          style={styles.retryButton}
        />
      </View>
    );
  }
  
  if (state.reviews.length === 0 && !state.loading) {
    return (
      <EmptyTabState
        icon={<Users size={48} color={edenTheme.colors.textSecondary} />}
        title="No Friend Reviews Yet"
        description="Follow friends to see their reviews here"
        actionButton={
          <Button
            label="Find Friends"
            variant="primary"
            onPress={onFindFriendsPress}
          />
        }
      />
    );
  }

  return (
    <FlatList
      data={state.reviews}
      renderItem={({ item, index }) => (
        <MemoizedFriendReviewCard
          review={item} 
          onPress={() => handleReviewPress(item)}
        />
      )}
      keyExtractor={getUniqueKey}
      contentContainerStyle={styles.container}
      style={[styles.flatList, { backgroundColor: edenTheme.colors.background }]}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshing={state.refreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      maxToRenderPerBatch={3}
      windowSize={5}
      ListFooterComponent={
        state.isLoadingMore ? (
          <ActivityIndicator size="small" color={edenTheme.colors.primary} style={styles.loadMoreIndicator} />
        ) : state.hasMore ? (
          <Button
            label="Load More"
            variant="tertiary"
            onPress={handleLoadMore}
            style={styles.loadMoreButton}
          />
        ) : state.reviews.length > 0 ? (
          <BodyText color={edenTheme.colors.textSecondary} style={styles.endOfListText}>
            You've reached the end
          </BodyText>
        ) : null
      }
    />
  );
});

// Apply memo to the forwardRef component for performance
export const MemoizedFriendsReviewsFeed = memo(FriendsReviewsFeed);

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
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
  loadMoreButton: {
    paddingVertical: 12,
  },
  endOfListText: {
    textAlign: 'center',
    paddingVertical: 16,
  },
  fillContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
}); 