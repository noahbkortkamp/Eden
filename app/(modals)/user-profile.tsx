import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Text, Button, Avatar, Card, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { getReviewsForUser } from '../utils/reviews';
import { format } from 'date-fns';
import { getCourse } from '../utils/courses';
import { getFollowCounts, isFollowing, followUser, unfollowUser } from '../utils/friends';
import { bookmarkService } from '../services/bookmarkService';
import { supabase } from '../utils/supabase';
import { ThumbsUp, ArrowLeft, User as UserIcon, UserPlus, UserCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';

// Get badge color based on rating
const getBadgeColor = (score: number): string => {
  if (score >= 7.0) return '#4CAF50'; // Green
  if (score >= 3.0) return '#FFC107'; // Yellow
  return '#F44336'; // Red
};

// Fallback scores by sentiment (used only when relative score isn't available from course_rankings)
const fallbackScores = {
  'liked': 8.8,
  'fine': 6.5,
  'didnt_like': 3.0
};

type ReviewWithCourse = {
  id: string;
  user_id: string;
  course_id: string;
  rating: any;
  notes?: string;
  date_played: string;
  playing_partners?: string[];
  course?: any;
  relativeScore?: number;
};

// Function to fetch relative scores for a user's courses
const fetchUserRelativeScores = async (userId: string, courseIds: string[]): Promise<Map<string, number>> => {
  try {
    const { data, error } = await supabase
      .from('course_rankings')
      .select('course_id, relative_score')
      .eq('user_id', userId)
      .in('course_id', courseIds);

    if (error) {
      console.error('Error fetching relative scores:', error);
      return new Map();
    }

    const scoresMap = new Map<string, number>();
    data?.forEach(ranking => {
      scoresMap.set(ranking.course_id, ranking.relative_score);
    });

    console.log(`Fetched relative scores for ${scoresMap.size} courses for user ${userId.substring(0, 8)}`);
    return scoresMap;
  } catch (error) {
    console.error('Exception fetching relative scores:', error);
    return new Map();
  }
};

export default function UserProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { userId, userName } = useLocalSearchParams<{ userId: string, userName: string }>();
  const theme = useTheme();
  
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [wantToPlayCount, setWantToPlayCount] = useState(0);
  const [hasEnoughReviews, setHasEnoughReviews] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isCurrentUserFollowing, setIsCurrentUserFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Load user profile data
  const loadUserProfile = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }
      
      setProfileData(data);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  };

  // Check if current user is following viewed user
  const checkFollowStatus = async () => {
    if (!user || !userId || user.id === userId) return;
    
    try {
      const following = await isFollowing(user.id, userId);
      setIsCurrentUserFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const loadReviews = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch all stats in parallel
      const [userReviews, followCounts, bookmarkedCourseIds] = await Promise.all([
        getReviewsForUser(userId),
        getFollowCounts(userId),
        bookmarkService.getBookmarkedCourseIds(userId)
      ]);
      
      // Update follow stats
      setFollowStats(followCounts);
      
      // Update bookmarked courses count
      setWantToPlayCount(bookmarkedCourseIds.length);
      
      // Check if user has enough reviews to show scores
      setHasEnoughReviews(userReviews.length >= 10);
      
      // Get course IDs to fetch relative scores
      const courseIds = userReviews.map(review => review.course_id);
      
      // Fetch relative scores for this user's courses
      const relativeScoresMap = await fetchUserRelativeScores(userId, courseIds);
      
      // Fetch course details for each review
      const reviewsWithCourses = await Promise.all(
        userReviews.map(async (review) => {
          try {
            const course = await getCourse(review.course_id);
            
            // Use actual relative score if available, otherwise fallback to sentiment mapping
            const relativeScore = relativeScoresMap.get(review.course_id) ?? fallbackScores[review.rating] ?? 5.0;
            
            return { 
              ...review, 
              course,
              relativeScore
            };
          } catch (error) {
            console.error(`Error loading course ${review.course_id}:`, error);
            return review;
          }
        })
      );
      
      // Sort reviews by date_played in descending order
      const sortedReviews = reviewsWithCourses.sort((a, b) => {
        const dateA = new Date(a.date_played).getTime();
        const dateB = new Date(b.date_played).getTime();
        return dateB - dateA;
      });
      
      setReviews(sortedReviews);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      router.back();
      return;
    }
    
    loadUserProfile();
    loadReviews();
    checkFollowStatus();
  }, [userId]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserProfile();
    loadReviews();
    checkFollowStatus();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!user || !userId || user.id === userId) return;
    
    setFollowLoading(true);
    try {
      if (isCurrentUserFollowing) {
        await unfollowUser(user.id, userId);
        setIsCurrentUserFollowing(false);
        // Update followers count
        setFollowStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        await followUser(user.id, userId);
        setIsCurrentUserFollowing(true);
        // Update followers count
        setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const getDisplayName = () => {
    if (profileData?.full_name) return profileData.full_name;
    if (userName) return userName;
    return 'User';
  };

  const getFirstLetter = () => {
    const name = getDisplayName();
    return name ? name[0].toUpperCase() : 'U';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHeader}>
          {profileData?.avatar_url ? (
            <Avatar.Image
              size={80}
              source={{ uri: profileData.avatar_url }}
            />
          ) : (
            <Avatar.Text
              size={80}
              label={getFirstLetter()}
              color="white"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
          <Text variant="headlineSmall" style={styles.name}>
            {getDisplayName()}
          </Text>
          
          {profileData?.email && (
            <Text variant="bodyMedium" style={styles.email}>
              {profileData.email}
            </Text>
          )}
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push({
                pathname: '/connections-list',
                params: { 
                  userId,
                  userName: getDisplayName(),
                  initialTab: 'followers'
                }
              })}
            >
              <Text variant="titleMedium" style={styles.statCount}>{followStats.followers}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push({
                pathname: '/connections-list',
                params: { 
                  userId,
                  userName: getDisplayName(),
                  initialTab: 'following'
                }
              })}
            >
              <Text variant="titleMedium" style={styles.statCount}>{followStats.following}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statCount}>{reviews.length}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Been</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statCount}>{wantToPlayCount}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Want to Play</Text>
            </View>
          </View>
          
          {/* Follow button - only show if viewing another user's profile */}
          {user && userId !== user.id && (
            <Button 
              mode={isCurrentUserFollowing ? "outlined" : "contained"}
              onPress={handleFollowToggle}
              loading={followLoading}
              disabled={followLoading}
              style={styles.actionButton}
              icon={({ size, color }) => 
                isCurrentUserFollowing ? 
                  <UserCheck size={size} color={color} /> : 
                  <UserPlus size={size} color={color} />
              }
            >
              {isCurrentUserFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.reviewsSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Reviews ({reviews.length})
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading reviews...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <UserIcon size={40} color={theme.colors.outline} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
                          reviews.map((review) => {
                // Use the actual relative score from course_rankings table, with sentiment fallback only if no ranking exists
                const score = review.relativeScore !== undefined 
                  ? review.relativeScore 
                  : fallbackScores[review.rating] || 0;
                
              const badgeColor = getBadgeColor(score);
              
              return (
                <TouchableOpacity 
                  key={review.id}
                  onPress={() => router.push({
                    pathname: '/review/summary',
                    params: { userId: review.user_id, courseId: review.course_id }
                  })}
                >
                  <Card style={styles.reviewCard}>
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.reviewInfo}>
                        <Text style={styles.reviewTitle}>
                          {getDisplayName()} played {review.course?.name || 'Unknown Course'}
                        </Text>
                        <Text style={styles.courseLocation}>
                          {review.course?.location || 'Unknown Location'}
                        </Text>
                        <Text style={styles.courseDatePlayed}>
                          {format(new Date(review.date_played), 'MMM d, yyyy')}
                        </Text>
                        {review.playing_partners && review.playing_partners.length > 0 && (
                          <Text style={styles.playingPartners}>
                            with {review.playing_partners.join(', ')}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.ratingBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.ratingText}>
                          {hasEnoughReviews ? formatScoreForDisplay(score).toFixed(1) : '-'}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
  },
  name: {
    marginTop: 12,
    fontWeight: '600',
  },
  email: {
    marginTop: 4,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statCount: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    marginTop: 2,
    fontSize: 12,
  },
  actionButton: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  divider: {
    marginVertical: 8,
  },
  reviewsSection: {
    padding: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 36,
  },
  emptyText: {
    marginTop: 12,
    color: '#666',
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  reviewCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewInfo: {
    flex: 1,
    paddingRight: 50,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  courseDatePlayed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  playingPartners: {
    fontSize: 14,
    color: '#666',
  },
  ratingBadge: {
    borderRadius: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
}); 