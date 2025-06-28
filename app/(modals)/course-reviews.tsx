import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { X, Star, User, Calendar, Tag as TagIcon, MessageSquare } from 'lucide-react-native';
import { getCourse } from '../utils/courses';
import type { Database } from '../utils/database.types';
import { courseRankingsService } from '../services/courseRankingsService';
import { Card } from '../components/eden/Card';
import { Heading1, Heading2, Heading3, BodyText, SmallText } from '../components/eden/Typography';
import { Icon } from '../components/eden/Icon';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';
import { format } from 'date-fns';

type Course = Database['public']['Tables']['courses']['Row'];

type ReviewWithDetails = {
  id: string;
  user_id: string;
  course_id: string;
  rating: 'liked' | 'fine' | 'didnt_like';
  notes: string | null;
  favorite_holes: number[];
  photos: string[];
  date_played: string;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string | null;
  };
  tags: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  relative_score?: number;
};

export default function CourseReviewsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <CourseReviewsContent />
    </>
  );
}

function CourseReviewsContent() {
  const { courseId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useEdenTheme();
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load course and reviews data
  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      try {
        if (!courseId) throw new Error('No course ID provided');
        
        // Load course and reviews in parallel
        const [courseData, reviewsData] = await Promise.all([
          getCourse(courseId as string),
          courseRankingsService.getAllCourseReviews(courseId as string)
        ]);
        
        if (!isMounted) return;
        
        setCourse(courseData);
        setReviews(reviewsData);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
        setLoading(false);
      }
    }

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handleReviewPress = (reviewId: string) => {
    router.push({
      pathname: '/review/friend-detail',
      params: { reviewId }
    });
  };

  const handleClose = () => {
    router.back();
  };

  const getSentimentColor = (rating: 'liked' | 'fine' | 'didnt_like') => {
    switch (rating) {
      case 'liked':
        return '#2E6338'; // Darker green for readability 
      case 'fine':
        return '#8B7355'; // Warm brown for neutral
      case 'didnt_like':
        return '#B85450'; // Readable red for negative
      default:
        return theme.colors.textSecondary;
    }
  };

  const getSentimentLabel = (rating: 'liked' | 'fine' | 'didnt_like') => {
    switch (rating) {
      case 'liked':
        return 'Liked';
      case 'fine':
        return 'Fine';
      case 'didnt_like':
        return 'Didn\'t Like';
      default:
        return 'Unknown';
    }
  };

  const renderReviewItem = ({ item: review }: { item: ReviewWithDetails }) => (
    <TouchableOpacity 
      onPress={() => handleReviewPress(review.id)}
      style={styles.reviewItemContainer}
    >
      <Card style={styles.reviewCard}>
        {/* Header with user info and date */}
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            {review.user.avatar_url ? (
              <Image
                source={{ uri: review.user.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                <Icon name="User" size="inline" color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.userDetails}>
              <BodyText style={styles.userName}>{review.user.full_name}</BodyText>
              <View style={styles.reviewMeta}>
                <SmallText color={theme.colors.textSecondary}>
                  {format(new Date(review.date_played), 'MMM d, yyyy')}
                </SmallText>
                <View style={styles.separator} />
                <SmallText 
                  color={getSentimentColor(review.rating)}
                  style={styles.sentimentText}
                >
                  {getSentimentLabel(review.rating)}
                </SmallText>
              </View>
            </View>
          </View>
          
          {/* Score badge */}
          {review.relative_score !== undefined && (
            <View style={[styles.scoreBadge, { backgroundColor: theme.colors.primary }]}>
                             <SmallText color="#FFFFFF" style={styles.scoreText}>
                {formatScoreForDisplay(review.relative_score).toFixed(1)}
              </SmallText>
            </View>
          )}
        </View>

        {/* Notes preview */}
        {review.notes && (
          <View style={styles.notesContainer}>
            <BodyText 
              numberOfLines={3} 
              style={styles.notesText}
              color={theme.colors.textSecondary}
            >
              {review.notes}
            </BodyText>
          </View>
        )}

        {/* Tags */}
        {review.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {review.tags.slice(0, 4).map((tag, index) => (
                <View 
                  key={tag.id} 
                  style={[styles.tag, { backgroundColor: theme.colors.border }]}
                >
                  <SmallText color={theme.colors.textSecondary}>
                    {tag.name}
                  </SmallText>
                </View>
              ))}
              {review.tags.length > 4 && (
                <View style={[styles.tag, { backgroundColor: theme.colors.border }]}>
                  <SmallText color={theme.colors.textSecondary}>
                    +{review.tags.length - 4} more
                  </SmallText>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Footer with additional info */}
        <View style={styles.reviewFooter}>
          {review.photos.length > 0 && (
            <View style={styles.footerItem}>
              <Icon name="Camera" size="inline" color={theme.colors.textSecondary} />
              <SmallText color={theme.colors.textSecondary} style={styles.footerText}>
                {review.photos.length} photo{review.photos.length !== 1 ? 's' : ''}
              </SmallText>
            </View>
          )}
          
          {review.favorite_holes.length > 0 && (
            <View style={styles.footerItem}>
              <Icon name="Flag" size="inline" color={theme.colors.textSecondary} />
              <SmallText color={theme.colors.textSecondary} style={styles.footerText}>
                {review.favorite_holes.length} favorite hole{review.favorite_holes.length !== 1 ? 's' : ''}
              </SmallText>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Heading3>Reviews</Heading3>
          <View style={styles.closeButton} />
        </View>
        
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <SmallText style={styles.loadingText}>Loading reviews...</SmallText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Heading3>Reviews</Heading3>
          <View style={styles.closeButton} />
        </View>
        
        <View style={styles.centerContent}>
          <SmallText color={theme.colors.error}>
            {error || 'Course not found'}
          </SmallText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Heading3>Reviews</Heading3>
          <SmallText color={theme.colors.textSecondary}>
            {course.name}
          </SmallText>
        </View>
        <View style={styles.closeButton} />
      </View>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="MessageSquare" size="hero" color={theme.colors.textSecondary} />
          <Heading3 color={theme.colors.textSecondary} style={styles.emptyTitle}>
            No reviews yet
          </Heading3>
          <SmallText color={theme.colors.textSecondary} style={styles.emptySubtitle}>
            Be the first to share your experience playing {course.name}!
          </SmallText>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
  reviewItemContainer: {
    marginBottom: 12,
  },
  reviewCard: {
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 8,
  },
  sentimentText: {
    fontWeight: '500',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  scoreText: {
    fontWeight: '600',
    fontSize: 12,
  },
  notesContainer: {
    marginBottom: 12,
  },
  notesText: {
    lineHeight: 20,
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footerText: {
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
}); 