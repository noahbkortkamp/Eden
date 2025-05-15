import React, { useEffect, useState } from 'react';
import { 
  View,
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/reviewService';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Edit3,
  Tag,
  Users,
  Flag,
  Camera
} from 'lucide-react-native';

// Eden components
import { Heading2, Heading3, BodyText, SmallText, Caption } from '../components/eden/Typography';
import { Card } from '../components/eden/Card';
import { Button } from '../components/eden/Button';
import { Icon } from '../components/eden/Icon';
import { FeedbackBadge } from '../components/eden/FeedbackBadge';
import { FilterChip } from '../components/eden/FilterChip';

// Define sentiment mappings for the FeedbackBadge component
const SENTIMENT_TO_STATUS = {
  liked: 'positive',
  fine: 'neutral',
  didnt_like: 'negative'
};

// Define sentiment label mapping
const SENTIMENT_LABELS = {
  liked: 'I liked it',
  fine: 'It was fine',
  didnt_like: 'I didn\'t like it'
};

// Map sentiment to icons
const SENTIMENT_ICONS = {
  liked: <ThumbsUp size={16} />,
  fine: <Minus size={16} />,
  didnt_like: <ThumbsDown size={16} />
};

// Placeholder image
const PLACEHOLDER_IMAGE = { uri: 'https://via.placeholder.com/100' };

export default function ReviewSummaryScreen() {
  // Get params and hooks
  const { courseId, userId: paramUserId } = useLocalSearchParams<{ courseId: string, userId: string }>();
  const router = useRouter();
  const theme = useEdenTheme();
  const { user } = useAuth();
  const userId = paramUserId || user?.id;
  
  // State
  const [review, setReview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch review data
  useEffect(() => {
    let isMounted = true;
    
    async function loadReview() {
      if (!userId || !courseId) {
        setError('Missing userId or courseId');
        setLoading(false);
        return;
      }
      
      try {
        const reviewData = await reviewService.getUserCourseReview(userId, courseId);
        
        if (!isMounted) return;
        
        if (!reviewData) {
          setError('No review found');
        } else {
          // Log the review data for debugging
          console.log('Review data loaded in summary:', {
            id: reviewData.id,
            courseId: reviewData.course_id,
            hasNotes: !!reviewData.notes,
            tagsCount: reviewData.tags?.length || 0,
            tags: JSON.stringify(reviewData.tags)
          });
          
          setReview(reviewData);
        }
        
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading review:', err);
        setError(err instanceof Error ? err.message : 'Failed to load review');
        setLoading(false);
      }
    }
    
    loadReview();
    
    return () => {
      isMounted = false;
    };
  }, [userId, courseId]);

  // Handle creating a new review if none exists
  const handleCreateReview = () => {
    router.push({
      pathname: '/(modals)/review',
      params: { courseId }
    });
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <SmallText style={styles.loadingText}>Loading review...</SmallText>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state with option to create a review
  if (error || !review) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false
          }}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Heading3>Review Not Found</Heading3>
        </View>
        
        <View style={styles.centerContent}>
          <BodyText color={theme.colors.textSecondary} center style={styles.errorText}>
            {error === 'No review found' 
              ? "You haven't reviewed this course yet." 
              : "There was a problem loading this review."}
          </BodyText>
          
          <Button 
            label="Review This Course"
            onPress={handleCreateReview}
            style={styles.createReviewButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Get sentiment status for FeedbackBadge
  const sentiment = review.rating || 'fine';
  const sentimentStatus = SENTIMENT_TO_STATUS[sentiment as keyof typeof SENTIMENT_TO_STATUS] as any;
  const sentimentLabel = SENTIMENT_LABELS[sentiment as keyof typeof SENTIMENT_LABELS];
  const sentimentIcon = SENTIMENT_ICONS[sentiment as keyof typeof SENTIMENT_ICONS];
  
  // Format the date
  const formattedDate = review.date_played 
    ? format(new Date(review.date_played), 'MMMM d, yyyy')
    : 'Unknown date';
  
  // Check for content
  const hasNotes = review.notes && review.notes.trim().length > 0;
  const hasTags = review.tags && review.tags.length > 0;
  const hasFavoriteHoles = review.favorite_holes && review.favorite_holes.length > 0;
  const hasPhotos = review.photos && review.photos.length > 0;
  const hasPlayingPartners = review.playing_partners && review.playing_partners.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Heading3>Your Review</Heading3>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Course Info */}
        <Card style={styles.courseInfoContainer}>
          <Heading2>{review.course?.name || 'Unknown Course'}</Heading2>
          <View style={styles.courseMetaContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <SmallText color={theme.colors.textSecondary} style={styles.metaText}>
              {review.course?.location || 'Unknown location'}
            </SmallText>
          </View>
          <View style={styles.courseMetaContainer}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <SmallText color={theme.colors.textSecondary} style={styles.metaText}>
              Played on {formattedDate}
            </SmallText>
          </View>
        </Card>

        {/* Sentiment */}
        <Card style={styles.sectionContainer}>
          <BodyText bold style={styles.sectionTitle}>Overall Rating</BodyText>
          <FeedbackBadge 
            status={sentimentStatus} 
            label={sentimentLabel}
            icon={sentimentIcon}
            style={styles.sentimentBadge}
          />
        </Card>

        {/* Tags */}
        {hasTags && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Tag size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Tags</BodyText>
            </View>
            <View style={styles.tagsContainer}>
              {review.tags && review.tags.length > 0 ? (
                review.tags.map((tag: any) => (
                  <FilterChip
                    key={tag.id || `tag-${tag.name}`}
                    label={tag.name}
                    selected={false}
                    onToggle={() => {}} // read-only in summary
                    style={styles.tagChip}
                  />
                ))
              ) : (
                <SmallText color={theme.colors.textSecondary}>No tags added</SmallText>
              )}
            </View>
          </Card>
        )}

        {/* Notes */}
        {hasNotes && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Edit3 size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Notes</BodyText>
            </View>
            <BodyText style={styles.notesText}>
              {review.notes}
            </BodyText>
          </Card>
        )}

        {/* Favorite Holes */}
        {hasFavoriteHoles && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Flag size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Favorite Holes</BodyText>
            </View>
            <View style={styles.holesContainer}>
              {review.favorite_holes.map((hole: any) => (
                <View key={`hole-${hole}`} style={styles.holeChip}>
                  <SmallText>{hole}</SmallText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Playing Partners */}
        {hasPlayingPartners && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Users size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Playing Partners</BodyText>
            </View>
            <View style={styles.partnersContainer}>
              {review.playing_partners.map((partner: any) => (
                <View key={partner.id} style={styles.partnerItem}>
                  <Image 
                    source={partner.avatar_url ? { uri: partner.avatar_url } : PLACEHOLDER_IMAGE}
                    style={styles.partnerAvatar}
                  />
                  <SmallText style={styles.partnerName}>{partner.name}</SmallText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Photos */}
        {hasPhotos && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Camera size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Photos</BodyText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
              {review.photos.map((photo: string, index: number) => (
                <Image
                  key={`photo-${index}`}
                  source={{ uri: photo }}
                  style={styles.photoItem}
                />
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Edit Button */}
        <Button
          label="Edit Review"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/(modals)/review',
            params: { 
              courseId: review.course_id, 
              reviewId: review.id 
            }
          })}
          style={styles.editButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  backButton: {
    marginRight: 16,
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  courseInfoContainer: {
    marginBottom: 16,
  },
  courseMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: {
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  notesText: {
    lineHeight: 22,
  },
  holesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  holeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 8,
  },
  partnersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  partnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  partnerName: {
    fontWeight: '500',
  },
  photosScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  photoItem: {
    width: 150,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  editButton: {
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    marginBottom: 20,
  },
  createReviewButton: {
    marginTop: 16,
  },
}); 