import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Button, Avatar, Card } from 'react-native-paper';
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

type Course = Database['public']['Tables']['courses']['Row'];
type Review = Database['public']['Tables']['reviews']['Row'];

interface ReviewWithCourse extends Review {
  course?: Course;
  relativeScore?: number;
}

// Get badge color based on rating
const getBadgeColor = (score: number): string => {
  if (score >= 7.0) return '#4CAF50'; // Green
  if (score >= 3.0) return '#FFC107'; // Yellow
  return '#F44336'; // Red
};

// Fallback scores by sentiment (only used if we can't get the real relative score)
const fallbackScores = {
  'liked': 8.8,
  'fine': 6.5,
  'didnt_like': 3.0
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [wantToPlayCount, setWantToPlayCount] = useState(0);
  const [hasEnoughReviews, setHasEnoughReviews] = useState(false);
  
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

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Please log in to view your profile</Text>
        <Button mode="contained" onPress={() => router.push('/auth/login')} style={styles.button}>
          Log In
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user.user_metadata?.name || 'User'}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user.email}
        </Text>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={styles.statCount}>{followStats.followers}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Followers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={styles.statCount}>{followStats.following}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Following</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigateToListsTab('played')}
          >
            <Text variant="titleMedium" style={styles.statCount}>{reviews.length}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Been</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigateToListsTab('want-to-play')}
          >
            <Text variant="titleMedium" style={styles.statCount}>{wantToPlayCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Want to Play</Text>
          </TouchableOpacity>
        </View>
        
        <Button mode="outlined" onPress={signOut} style={styles.button}>
          Sign Out
        </Button>
      </View>

      <View style={styles.reviewsSection}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Your Reviews ({reviews.length})
        </Text>

        {isLoading ? (
          <Text>Loading reviews...</Text>
        ) : reviews.length === 0 ? (
          <Text>No reviews yet</Text>
        ) : (
          reviews.map((review) => {
            // Use the actual relative score if available, otherwise fallback to sentiment mapping
            const score = review.relativeScore !== undefined 
              ? review.relativeScore 
              : fallbackScores[review.rating] || 0;
              
            const badgeColor = getBadgeColor(score);
            
            return (
              <TouchableOpacity 
                key={review.id}
                onPress={() => router.push({
                  pathname: '/course/[id]',
                  params: { id: review.course_id }
                })}
              >
                <Card style={styles.reviewCard}>
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewTitle}>
                        You ranked {review.course?.name || 'Unknown Course'}
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
                        {hasEnoughReviews ? score.toFixed(1) : '-'}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
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
  },
  button: {
    marginTop: 16,
  },
  reviewsSection: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 12,
    borderRadius: 12,
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