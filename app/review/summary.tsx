import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
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

// Define sentiment ranges with their colors and icons
const SENTIMENT_CONFIGS = {
  liked: { color: '#22c55e', icon: ThumbsUp, label: 'I liked it' },
  fine: { color: '#f59e0b', icon: Minus, label: 'It was fine' },
  didnt_like: { color: '#ef4444', icon: ThumbsDown, label: 'I didn\'t like it' }
};

// Placeholder image
const PLACEHOLDER_IMAGE = { uri: 'https://via.placeholder.com/100' };

export default function ReviewSummaryScreen() {
  // Get params and hooks
  const { courseId, userId: paramUserId } = useLocalSearchParams<{ courseId: string, userId: string }>();
  const router = useRouter();
  const theme = useTheme();
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading review...
          </Text>
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Review Not Found
          </Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            {error === 'No review found' 
              ? "You haven't reviewed this course yet." 
              : "There was a problem loading this review."}
          </Text>
          
          <TouchableOpacity 
            style={[styles.createReviewButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreateReview}
          >
            <Text style={[styles.createReviewButtonText, { color: theme.colors.onPrimary }]}>
              Review This Course
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get sentiment display information
  const sentiment = review.rating || 'fine';
  const sentimentConfig = SENTIMENT_CONFIGS[sentiment as keyof typeof SENTIMENT_CONFIGS];
  const SentimentIcon = sentimentConfig.icon;
  
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Your Review
        </Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Course Info */}
        <View style={[styles.courseInfoContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.courseName, { color: theme.colors.text }]}>
            {review.course?.name || 'Unknown Course'}
          </Text>
          <View style={styles.courseMetaContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
              {review.course?.location || 'Unknown location'}
            </Text>
          </View>
          <View style={styles.courseMetaContainer}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
              Played on {formattedDate}
            </Text>
          </View>
        </View>

        {/* Sentiment */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Overall Rating
          </Text>
          <View style={[styles.sentimentContainer, { backgroundColor: sentimentConfig.color + '15' }]}>
            <SentimentIcon size={24} color={sentimentConfig.color} />
            <Text style={[styles.sentimentText, { color: sentimentConfig.color }]}>
              {sentimentConfig.label}
            </Text>
          </View>
        </View>

        {/* Tags */}
        {hasTags && (
          <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Tag size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Tags
              </Text>
            </View>
            <View style={styles.tagsContainer}>
              {review.tags && review.tags.length > 0 ? (
                review.tags.map((tag: any) => (
                  <View 
                    key={tag.id || `tag-${tag.name}`} 
                    style={[styles.tagBadge, { backgroundColor: theme.colors.border }]}
                  >
                    <Text style={[styles.tagText, { color: theme.colors.text }]}>
                      {tag.name}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[{ color: theme.colors.textSecondary }]}>No tags found</Text>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {hasNotes && (
          <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Edit3 size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Notes
              </Text>
            </View>
            <Text style={[styles.notesText, { color: theme.colors.text }]}>
              {review.notes}
            </Text>
          </View>
        )}

        {/* Favorite Holes */}
        {hasFavoriteHoles && (
          <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Flag size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Favorite Holes
              </Text>
            </View>
            <Text style={[styles.holesText, { color: theme.colors.text }]}>
              {Array.isArray(review.favorite_holes) 
                ? review.favorite_holes.sort((a: number, b: number) => a - b).join(', ')
                : 'None selected'}
            </Text>
          </View>
        )}

        {/* Playing Partners */}
        {hasPlayingPartners && (
          <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Users size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Played With
              </Text>
            </View>
            <Text style={[styles.partnersText, { color: theme.colors.text }]}>
              {Array.isArray(review.playing_partners)
                ? review.playing_partners.map((partner: any) => partner.full_name || partner).join(', ')
                : 'None'}
            </Text>
          </View>
        )}

        {/* Photos */}
        {hasPhotos && (
          <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Camera size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Photos
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScrollContainer}
            >
              {review.photos.map((photo: string, index: number) => (
                <Image 
                  key={`photo-${index}`}
                  source={{ uri: photo }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder={PLACEHOLDER_IMAGE}
                  transition={300}
                />
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Future "Edit Review" button placeholder */}
        <View style={styles.editButtonPlaceholder}>
          {/* Will be implemented in future iterations */}
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
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createReviewButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createReviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  courseInfoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  courseName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  courseMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  courseLocation: {
    fontSize: 14,
    marginLeft: 8,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 8,
  },
  sectionContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  holesText: {
    fontSize: 16,
  },
  partnersText: {
    fontSize: 16,
  },
  photosScrollContainer: {
    paddingVertical: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  editButtonPlaceholder: {
    height: 60,
  }
}); 