import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { getReviewsForUser } from '../utils/reviews';
import { format } from 'date-fns';
import { getCourse } from '../utils/courses';
import { getFollowCounts } from '../utils/friends';
import { bookmarkService } from '../services/bookmarkService';
import { supabase } from '../utils/supabase';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import type { Database } from '../utils/database.types';
import { Image } from 'expo-image';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';

// Import Eden design system components
import { 
  Card, 
  Button, 
  Heading1, 
  Heading2, 
  Heading3, 
  BodyText, 
  SmallText,
  FeedbackBadge,
  Icon
} from '../components/eden';
import { useEdenTheme } from '../theme';
import { LazyTabWrapper } from '../components/LazyTabWrapper';
import { useTabLazyLoadingContext } from '../context/TabLazyLoadingContext';

type Course = Database['public']['Tables']['courses']['Row'];
type Review = Database['public']['Tables']['reviews']['Row'];

interface ReviewWithCourse extends Review {
  course?: Course;
  relativeScore?: number;
}

// Get badge color based on rating, using Eden theme colors
const getBadgeStatus = (score: number): 'positive' | 'neutral' | 'negative' => {
  if (score >= 7.0) return 'positive';
  if (score >= 3.0) return 'neutral';
  return 'negative';
};

// Fallback scores by sentiment (only used if we can't get the real relative score)
const fallbackScores = {
  'liked': 8.8,
  'fine': 6.5,
  'didnt_like': 3.0
};

function ProfileScreenContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [wantToPlayCount, setWantToPlayCount] = useState(0);
  const [hasEnoughReviews, setHasEnoughReviews] = useState(false);
  const theme = useEdenTheme();
  
  // Access the shared played courses context
  const { playedCourses } = usePlayedCourses();

  const loadReviews = async () => {
    if (!user) return;
    try {
      // Fetch all stats in parallel
      const [userReviews, followCounts, bookmarkedCourseIds] = await Promise.all([
        getReviewsForUser(user.id),
        getFollowCounts(user.id),
        bookmarkService.getBookmarkedCourseIds(user.id)
      ]);
      
      // Update follow stats
      setFollowStats(followCounts);
      
      // Update bookmarked courses count
      setWantToPlayCount(bookmarkedCourseIds.length);
      
      // Check if user has enough reviews to show scores
      setHasEnoughReviews(userReviews.length >= 10);
      
      // Create a map of courseId -> rating from the played courses context
      const courseRatingsMap: Record<string, number> = {};
      if (playedCourses && playedCourses.length > 0) {
        playedCourses.forEach(course => {
          if (course.id && course.rating !== undefined) {
            courseRatingsMap[course.id] = course.rating;
          }
        });
      }
      
      // Fetch course details for each review
      const reviewsWithCourses = await Promise.all(
        userReviews.map(async (review) => {
          try {
            const course = await getCourse(review.course_id);
            
            // Get the relative score from the context-provided ratings map
            const relativeScore = courseRatingsMap[review.course_id];
            
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
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    loadReviews();
  }, [user, playedCourses]); // Re-run when playedCourses changes

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadReviews();
  }, []);

  const navigateToListsTab = (section: 'played' | 'want-to-play') => {
    router.push({
      pathname: '/lists',
      params: { initialTab: section }
    });
  };

  // Generate initials from user name or email
  const getInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return '?';
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <BodyText>Please log in to view your profile</BodyText>
        <Button 
          label="Log In" 
          variant="primary" 
          onPress={() => router.push('/auth/login')} 
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Heading1 color="#FFFFFF">
              {getInitials()}
            </Heading1>
          </View>
        </View>
        
        <Heading2 style={styles.name}>
          {user.user_metadata?.name || 'User'}
        </Heading2>
        
        <SmallText color={theme.colors.textSecondary} style={styles.email}>
          {user.email}
        </SmallText>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push({
              pathname: '/connections-list',
              params: { 
                userId: user.id,
                userName: user.user_metadata?.name || 'User',
                initialTab: 'followers'
              }
            })}
          >
            <Heading3>{followStats.followers}</Heading3>
            <SmallText color={theme.colors.textSecondary}>Followers</SmallText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push({
              pathname: '/connections-list',
              params: { 
                userId: user.id,
                userName: user.user_metadata?.name || 'User',
                initialTab: 'following'
              }
            })}
          >
            <Heading3>{followStats.following}</Heading3>
            <SmallText color={theme.colors.textSecondary}>Following</SmallText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigateToListsTab('played')}
          >
            <Heading3>{reviews.length}</Heading3>
            <SmallText color={theme.colors.textSecondary}>Been</SmallText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigateToListsTab('want-to-play')}
          >
            <Heading3>{wantToPlayCount}</Heading3>
            <SmallText color={theme.colors.textSecondary}>Want to Play</SmallText>
          </TouchableOpacity>
        </View>
        
        <Button 
          label="Sign Out" 
          variant="secondary" 
          onPress={signOut} 
          style={styles.button}
        />
      </View>

      <View style={styles.reviewsSection}>
        <Heading2 style={styles.sectionTitle}>
          Your Reviews ({reviews.length})
        </Heading2>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <BodyText color={theme.colors.textSecondary}>Loading reviews...</BodyText>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon 
              name="GolfHole" 
              size="hero" 
              color={theme.colors.textSecondary}
              style={styles.emptyIcon}
            />
            <BodyText color={theme.colors.textSecondary}>No reviews yet</BodyText>
            <Button 
              label="Explore Courses" 
              variant="primary" 
              onPress={() => router.push('/search')}
              style={styles.exploreButton}
            />
          </View>
        ) : (
          reviews.map((review) => {
            // Use the actual relative score if available, otherwise fallback to sentiment mapping
            const score = review.relativeScore !== undefined 
              ? review.relativeScore 
              : fallbackScores[review.rating] || 0;
              
            const badgeStatus = getBadgeStatus(score);
            
            return (
              <Card
                key={review.id}
                variant="listItem"
                pressable
                onPress={() => router.push({
                  pathname: '/review/summary',
                  params: { userId: user.id, courseId: review.course_id }
                })}
                style={styles.reviewCard}
              >
                <View style={styles.cardContent}>
                  <View style={styles.reviewInfo}>
                    <BodyText bold style={styles.reviewTitle}>
                      {review.course?.name || 'Unknown Course'}
                    </BodyText>
                    
                    <SmallText color={theme.colors.textSecondary} style={styles.courseLocation}>
                      {review.course?.location || 'Unknown Location'}
                    </SmallText>
                    
                    <SmallText color={theme.colors.textSecondary} style={styles.courseDatePlayed}>
                      {format(new Date(review.date_played), 'MMM d, yyyy')}
                    </SmallText>
                    
                    {review.playing_partners && review.playing_partners.length > 0 && (
                      <SmallText color={theme.colors.textSecondary} style={styles.playingPartners}>
                        with {review.playing_partners.join(', ')}
                      </SmallText>
                    )}
                  </View>
                  
                  <FeedbackBadge
                    status={badgeStatus}
                    label={hasEnoughReviews ? formatScoreForDisplay(score).toFixed(1) : '-'}
                    small
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0DC', // Eden border color
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#234D2C', // Eden primary color
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    marginBottom: 4,
  },
  email: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  button: {
    minWidth: 150,
  },
  reviewsSection: {
    padding: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewInfo: {
    flex: 1,
    paddingRight: 12,
  },
  reviewTitle: {
    marginBottom: 4,
  },
  courseLocation: {
    marginBottom: 2,
  },
  courseDatePlayed: {
    marginBottom: 2,
  },
  playingPartners: {
    marginBottom: 0,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  exploreButton: {
    marginTop: 16,
  }
});

// Export the lazy-loaded version
export default function ProfileScreen() {
  const { isTabActivated } = useTabLazyLoadingContext();
  const tabName = 'profile';
  
  const handleFirstActivation = () => {
    console.log('🚀 Profile tab: First activation - will load profile data');
    // The profile data loading will be triggered by the component mount
  };
  
  return (
    <LazyTabWrapper
      isActive={true} // This tab is controlled by the navigation
      hasBeenActive={isTabActivated(tabName)}
      onFirstActivation={handleFirstActivation}
      tabName="Profile"
    >
      <ProfileScreenContent />
    </LazyTabWrapper>
  );
} 