import React, { useState, useEffect, useCallback, useReducer, memo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme, useEdenTheme } from '../theme/ThemeProvider';
import { SimpleFriendReviewCard } from './SimpleFriendReviewCard';
import { getFriendsReviews } from '../utils/friends';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users } from 'lucide-react-native';
import { colors } from '../theme/tokens';
import { Heading2, BodyText, Button } from '../components/eden';
import { RealtimeErrorBoundary } from './RealtimeErrorBoundary';

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
  const { user } = useAuth();
  const router = useRouter();
  const edenTheme = useEdenTheme();
  
  // Stable refs that don't cause re-renders
  const userRef = useRef(user);
  const stateRef = useRef<ReviewsState>(initialState);
  
  // Initialize reducer
  const [state, dispatch] = useReducer(reviewsReducer, initialState);
  
  // Update refs when state or user changes (but don't cause re-render)
  useEffect(() => {
    userRef.current = user;
    stateRef.current = state;
  }, [user, state]);

  // STABLE: Update cache with new data
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
  }, []); // No dependencies, this is stable

  // STABLE: Load cached data
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) return false;

      const { timestamp, data, version } = JSON.parse(cachedData);
      
      // Check if cache is still valid (15 minutes)
      if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
        return false;
      }

      // Version check for cache compatibility
      if (version !== '1.0') {
        await AsyncStorage.removeItem(CACHE_KEY);
        return false;
      }

      if (data && data.length > 0) {
        const deduplicatedData = deduplicateReviews(data);
        dispatch({ 
          type: 'FETCH_SUCCESS', 
          data: deduplicatedData, 
          isFirstPage: true, 
          hasMore: data.length === 10 
        });
        return true;
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      await AsyncStorage.removeItem(CACHE_KEY);
    }
    return false;
  }, []); // No dependencies, this is stable

  // STABLE: Fetch fresh data from API
  const fetchFreshData = useCallback(async (currentPage: number, pageSize: number, isBackground = false) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    try {
      if (!isBackground && currentPage > 1) {
        dispatch({ type: 'LOAD_MORE_START' });
      }
      
      const reviewsData = await getFriendsReviews(currentUser.id, currentPage, pageSize);
      const deduplicatedData = deduplicateReviews(reviewsData);
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        data: deduplicatedData, 
        isFirstPage: currentPage === 1, 
        hasMore: reviewsData.length === pageSize 
      });

      // Update cache only for first page and non-background requests
      if (currentPage === 1 && !isBackground) {
        await updateCache(deduplicatedData);
      }
    } catch (err) {
      console.error('Error in fetchFreshData:', err);
      if (!isBackground) {
        dispatch({ type: 'FETCH_ERROR', error: 'An unexpected error occurred' });
      }
    }
  }, [updateCache]); // Stable dependencies only

  // STABLE: Main fetch function with fixed dependencies
  const fetchReviews = useCallback(async (refresh = false) => {
    const currentUser = userRef.current;
    const currentState = stateRef.current;
    if (!currentUser) return;
    
    const currentPage = refresh ? 1 : currentState.page;
    const pageSize = 10;
    
    dispatch({ type: 'FETCH_START', refresh });
    
    try {
      // Only use cache for initial load, not refreshes
      if (currentPage === 1 && !refresh) {
        const hasCachedData = await loadCachedData();
        if (hasCachedData) {
          // Background refresh with cached data
          fetchFreshData(currentPage, pageSize, true);
          return;
        }
      }
      
      await fetchFreshData(currentPage, pageSize);
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', error: 'Failed to load reviews' });
    }
  }, [loadCachedData, fetchFreshData]); // Fixed stable dependencies

  // STABLE: Handle refresh
  const handleRefresh = useCallback(() => {
    dispatch({ type: 'SET_PAGE', page: 1 });
    fetchReviews(true);
  }, [fetchReviews]);

  // STABLE: Handle load more
  const handleLoadMore = useCallback(() => {
    if (!state.isLoadingMore && state.hasMore) {
      dispatch({ type: 'SET_PAGE', page: state.page + 1 });
      fetchReviews();
    }
  }, [state.isLoadingMore, state.hasMore, state.page, fetchReviews]);

  // STABLE: Handle review press
  const handleReviewPress = useCallback((review: any) => {
    if (!review || !review.id) return;
    
    router.push({
      pathname: '/review/friend-detail',
      params: { reviewId: review.id }
    });
  }, [router]);

  // STABLE: Key extractor
  const getUniqueKey = useCallback((item: any, index: number) => {
    const timestamp = item.created_at ? 
      item.created_at.replace(/[-:\.]/g, '').replace(/[^a-zA-Z0-9]/g, '') : 
      Date.now().toString();
    
    return `review-${item.id || 'unknown'}-${timestamp}-${index}`;
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleRefresh
  }), [handleRefresh]);

  // ONE-TIME EFFECT: Initial data load
  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      if (mounted) {
        await fetchReviews();
      }
    };
    
    initializeData();
    
    return () => {
      mounted = false;
    };
  }, []); // NO dependencies - this runs only once

  // MOVE EmptyFeedState OUTSIDE of render to prevent recreation
  const EmptyFeedState = useCallback<React.FC<{
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionButton?: React.ReactNode;
  }>>(({ icon, title, description, actionButton }) => {
    return (
      <View style={[styles.emptyStateContainer, { backgroundColor: edenTheme.colors.background }]}>
        {icon && <View style={styles.emptyStateIcon}>{icon}</View>}
        <Heading2 style={[styles.emptyStateTitle, { color: edenTheme.colors.text }]}>
          {title}
        </Heading2>
        <BodyText 
          style={[styles.emptyStateDescription, { color: edenTheme.colors.textSecondary }]}
          center
        >
          {description}
        </BodyText>
        {actionButton && <View style={styles.emptyStateAction}>{actionButton}</View>}
      </View>
    );
  }, [edenTheme.colors.background, edenTheme.colors.text, edenTheme.colors.textSecondary]);
  
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
      <EmptyFeedState
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
    <RealtimeErrorBoundary
      onError={(error, errorInfo) => {
        console.error('FriendsReviewsFeed Error:', { error, errorInfo });
        // You could also log to crash reporting service here
      }}
    >
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
    </RealtimeErrorBoundary>
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateAction: {
    marginTop: 8,
  },
}); 