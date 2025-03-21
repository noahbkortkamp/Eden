import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Button, Avatar, Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { getReviewsForUser } from '../utils/reviews';
import { format } from 'date-fns';
import { getCourse } from '../utils/courses';
import { getFollowCounts } from '../utils/friends';
import { bookmarkService } from '../services/bookmarkService';
import type { Database } from '../utils/database.types';

type Course = Database['public']['Tables']['courses']['Row'];
type Review = Database['public']['Tables']['reviews']['Row'];

interface ReviewWithCourse extends Review {
  course?: Course;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [wantToPlayCount, setWantToPlayCount] = useState(0);

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
      
      // Fetch course details for each review
      const reviewsWithCourses = await Promise.all(
        userReviews.map(async (review) => {
          try {
            const course = await getCourse(review.course_id);
            return { ...review, course };
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
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadReviews();
  }, []);

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
          
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={styles.statCount}>{reviews.length}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Been</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={styles.statCount}>{wantToPlayCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Want to Play</Text>
          </View>
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
          reviews.map((review) => (
            <Card key={review.id} style={styles.reviewCard}>
              <Card.Content>
                <Text variant="titleMedium">{review.course?.name || 'Unknown Course'}</Text>
                <Text variant="bodyMedium" style={styles.location}>
                  {review.course?.location || 'Location unknown'}
                </Text>
                <Text variant="bodyMedium" style={styles.date}>
                  Played on {format(new Date(review.date_played), 'MMM d, yyyy')}
                </Text>
                <Text variant="bodyMedium" style={styles.rating}>
                  Rating: {review.rating}
                </Text>
                {review.notes && (
                  <Text variant="bodyMedium" style={styles.notes}>
                    {review.notes}
                  </Text>
                )}
                <Text variant="bodySmall" style={styles.reviewDate}>
                  Reviewed on {format(new Date(review.created_at), 'MMM d, yyyy')}
                </Text>
              </Card.Content>
            </Card>
          ))
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
  },
  location: {
    marginTop: 4,
    color: '#666',
  },
  date: {
    marginTop: 4,
    color: '#666',
  },
  rating: {
    marginTop: 4,
    color: '#666',
  },
  notes: {
    marginTop: 8,
  },
  reviewDate: {
    marginTop: 8,
    color: '#999',
  },
}); 