import React, { useState, useEffect, useCallback } from 'react';
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
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

interface FriendsReviewsFeedProps {
  onFindFriendsPress: () => void;
}

export const FriendsReviewsFeed: React.FC<FriendsReviewsFeedProps> = ({ onFindFriendsPress }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (refresh = false) => {
    if (!user) return;
    
    const currentPage = refresh ? 1 : page;
    const pageSize = 10;
    
    if (refresh) {
      setLoading(true);
      setRefreshing(true);
    } else if (currentPage > 1) {
      setIsLoadingMore(true);
    }
    
    try {
      // Check cache only for initial load (page 1)
      if (currentPage === 1 && !refresh) {
        const cachedData = await AsyncStorage.getItem('friendsReviewsCache');
        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;
          
          if (!isExpired) {
            setReviews(data);
            setLoading(false);
            return;
          }
        }
      }
      
      const newReviews = await getFriendsReviews(user.id, currentPage, pageSize);
      console.log(`Loaded ${newReviews.length} reviews for page ${currentPage}`);
      
      // Check if we've reached the end
      const hasMoreReviews = newReviews.length > 0 && newReviews.length >= pageSize;
      setHasMore(hasMoreReviews);
      
      if (refresh || currentPage === 1) {
        setReviews(newReviews);
        
        // Update cache for page 1
        await AsyncStorage.setItem('friendsReviewsCache', JSON.stringify({
          timestamp: Date.now(),
          data: newReviews,
        }));
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }
      
      if (refresh || currentPage === 1) {
        setPage(1);
      } else {
        setPage(currentPage + 1);
      }
    } catch (err) {
      console.error('Error fetching friend reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [user, page]);
  
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
          console.log('New review received:', payload);
          
          // Check if the review is from someone the user follows
          try {
            // Get the review with full details
            const { data, error } = await supabase
              .from('followed_users_reviews')
              .select('*')
              .eq('id', payload.new.id)
              .eq('follower_id', user.id)
              .single();
              
            if (error) {
              console.error('Error checking if review is from followed user:', error);
              return;
            }
            
            // If the review is from a followed user, add it to the feed
            if (data) {
              console.log('Adding new review to feed:', data);
              setReviews(prevReviews => [data, ...prevReviews]);
              
              // Update cache
              const cachedData = await AsyncStorage.getItem('friendsReviewsCache');
              if (cachedData) {
                const { timestamp, data: cachedReviews } = JSON.parse(cachedData);
                await AsyncStorage.setItem('friendsReviewsCache', JSON.stringify({
                  timestamp,
                  data: [data, ...cachedReviews],
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
  const handleLoadMore = () => {
    console.log(`Handle load more called. hasMore: ${hasMore}, isLoadingMore: ${isLoadingMore}`);
    if (!isLoadingMore && hasMore) {
      console.log('Loading more reviews...');
      fetchReviews();
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchReviews(true);
  };
  
  // Handle review press
  const handleReviewPress = (courseId: string) => {
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId }
    });
  };
  
  if (loading && !refreshing && !isLoadingMore) {
    return (
      <View style={[styles.fillContainer, styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.fillContainer, styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} 
          onPress={() => fetchReviews(true)}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (reviews.length === 0 && !loading) {
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
      data={reviews}
      renderItem={({ item }) => (
        <FriendReviewCard 
          review={item} 
          onPress={() => handleReviewPress(item.course_id)}
        />
      )}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
      style={styles.flatList}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadMoreIndicator} />
        ) : hasMore ? (
          <TouchableOpacity 
            style={styles.loadMoreButton} 
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        ) : reviews.length > 0 ? (
          <Text style={styles.endOfListText}>You've reached the end</Text>
        ) : null
      }
    />
  );
};

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