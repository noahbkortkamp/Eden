import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Button, Avatar, Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { getReviewsForUser } from '../utils/reviews';
import { CourseReview } from '../types/review';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = async () => {
    if (!user) return;
    try {
      const userReviews = await getReviewsForUser(user.id);
      setReviews(userReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
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
                <Text variant="titleMedium">{review.course_id}</Text>
                <Text variant="bodyMedium" style={styles.rating}>
                  Rating: {review.rating}
                </Text>
                {review.notes && (
                  <Text variant="bodyMedium" style={styles.notes}>
                    {review.notes}
                  </Text>
                )}
                <Text variant="bodySmall" style={styles.date}>
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
  rating: {
    marginTop: 4,
    color: '#666',
  },
  notes: {
    marginTop: 8,
  },
  date: {
    marginTop: 8,
    color: '#999',
  },
}); 