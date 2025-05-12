import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { useTheme, useEdenTheme } from '../theme/ThemeProvider';
import { ThumbsUp, ThumbsDown, Minus, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LikeButton } from './LikeButton';
import { CommentsButton } from './CommentsButton';
import { bookmarkService } from '../services/bookmarkService';
import { useAuth } from '../context/AuthContext';
import EDEN_COLORS from '../theme/edenColors';

// Define sentiment ranges with their colors and icons
const SENTIMENT_RANGES = {
  liked: { min: 7.0, max: 10.0, color: EDEN_COLORS.SUCCESS, icon: ThumbsUp },
  fine: { min: 3.0, max: 6.9, color: EDEN_COLORS.WARNING, icon: Minus },
  didnt_like: { min: 0.0, max: 2.9, color: EDEN_COLORS.DANGER, icon: ThumbsDown }
};

// Helper function to determine sentiment from numeric rating
const getSentimentFromRating = (rating: number | null | undefined): 'liked' | 'fine' | 'didnt_like' => {
  if (!rating) return 'fine'; // Default to 'fine' if no rating
  if (rating >= SENTIMENT_RANGES.liked.min) return 'liked';
  if (rating >= SENTIMENT_RANGES.fine.min) return 'fine';
  return 'didnt_like';
};

// Helper function to format rating for display
const formatRating = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return '-';
  return rating.toFixed(1);
};

// Helper function to extract town from location
const getTownFromLocation = (location: string | null | undefined): string => {
  if (!location) return 'Unknown location';
  const parts = location.split(',');
  return parts[0]?.trim() || 'Unknown location';
};

interface FriendReviewCardProps {
  review: {
    id: string;
    user_id: string;
    course_id: string;
    rating: number;
    sentiment: string;
    notes?: string | null;
    date_played: string;
    created_at: string;
    full_name: string;
    avatar_url?: string | null;
    course_name: string;
    course_location: string;
    playing_partners?: Array<{
      id: string;
      full_name: string;
      avatar_url?: string | null;
    }>;
    photos?: string[];
    favorite_holes?: number[];
    likes_count: number;
    is_liked_by_me: boolean;
    comments_count: number;
    is_bookmarked?: boolean;
  };
  onPress?: () => void;
}

// Placeholder image for avatar
const PLACEHOLDER_IMAGE = { uri: 'https://via.placeholder.com/40' };

// Using memo to prevent unnecessary re-renders
const FriendReviewCard = memo<FriendReviewCardProps>(({ review, onPress }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(review.is_bookmarked || false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  
  // Use the numeric rating to determine sentiment and styling
  const sentiment = getSentimentFromRating(review.rating);
  const sentimentConfig = SENTIMENT_RANGES[sentiment];
  const RatingIcon = sentimentConfig.icon;
  
  // Check if there are playing partners to mention
  const hasPlayingPartners = review.playing_partners && review.playing_partners.length > 0;
  // Check if there are photos to display
  const hasPhotos = review.photos && review.photos.length > 0;
  
  // Get first letter for avatar placeholder
  const firstLetter = review.full_name?.charAt(0).toUpperCase() || 'U';
  
  // Handle user profile navigation
  const handleUserPress = (e) => {
    e.stopPropagation(); // Stop event propagation to prevent triggering onPress
    router.push({
      pathname: '/(modals)/user-profile',
      params: {
        userId: review.user_id,
        userName: review.full_name
      }
    });
  };
  
  // Handle bookmark toggle - add/remove course to "Want to Play" list
  const handleBookmarkToggle = async () => {
    if (!user || !review.course_id) return;
    
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await bookmarkService.removeBookmark(user.id, review.course_id);
        setIsBookmarked(false);
      } else {
        await bookmarkService.addBookmark(user.id, review.course_id);
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error('Error toggling course bookmark:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: EDEN_COLORS.PAPER_BACKGROUND }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          {review.avatar_url ? (
            <Image 
              source={{ uri: review.avatar_url }} 
              placeholder={PLACEHOLDER_IMAGE}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`avatar-${review.user_id}`}
              transition={200}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: EDEN_COLORS.PRIMARY }]}>
              <Text style={styles.avatarText}>
                {firstLetter}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.userName, { color: EDEN_COLORS.PRIMARY }]}>
              {review.full_name}
            </Text>
            <Text style={[styles.date, { color: '#8E8E93' }]}>
              {format(new Date(review.created_at), 'MMM d, yyyy')}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={[styles.ratingBadge, { backgroundColor: sentimentConfig.color + '20' }]}>
          <RatingIcon size={20} color={sentimentConfig.color} />
          <Text style={[styles.ratingText, { color: sentimentConfig.color }]}>
            {formatRating(review.rating)}
          </Text>
        </View>
      </View>

      {/* Main content header - "User played Course with X people" */}
      <Text style={[styles.mainHeader, { color: '#000000' }]} numberOfLines={2}>
        <Text onPress={handleUserPress} style={[styles.userNameInText, { color: EDEN_COLORS.PRIMARY }]}>
          {review.full_name}
        </Text> played {review.course_name}
        {hasPlayingPartners ? ` with ${review.playing_partners.length} ${review.playing_partners.length === 1 ? 'person' : 'people'}` : ''}
      </Text>
      
      {/* Show review content if available - with max lines */}
      {review.notes && (
        <Text 
          style={[styles.notes, { color: '#000000' }]} 
          numberOfLines={3}
        >
          {review.notes}
        </Text>
      )}
      
      {/* Photos Section - only if photos exist - using optimized rendering */}
      {hasPhotos && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.photosContainer}
        >
          {review.photos.map((photo, index) => (
            <Image 
              key={`${review.id}-photo-${index}-${photo.substring(photo.lastIndexOf('/') + 1)}`}
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`review-photo-${review.id}-${index}`}
              placeholder={PLACEHOLDER_IMAGE}
              transition={300}
            />
          ))}
        </ScrollView>
      )}
      
      {/* Favorite holes - only if present */}
      {review.favorite_holes && review.favorite_holes.length > 0 && (
        <Text style={[styles.favoriteHoles, { color: '#8E8E93' }]}>
          Favorite holes: {review.favorite_holes.join(', ')}
        </Text>
      )}

      {/* Social interactions */}
      <View style={[styles.interactionsContainer, { borderTopColor: EDEN_COLORS.BORDER }]}>
        <View style={styles.leftInteractions}>
          <LikeButton 
            reviewId={review.id} 
            size={22}
            initialLikeCount={review.likes_count}
            initialLiked={review.is_liked_by_me}
          />
          <View style={styles.interactionSpacer} />
          <CommentsButton 
            reviewId={review.id} 
            size={22}
            initialCommentsCount={review.comments_count}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={handleBookmarkToggle}
          disabled={bookmarkLoading}
        >
          {bookmarkLoading ? (
            <ActivityIndicator size="small" color={EDEN_COLORS.PRIMARY} />
          ) : isBookmarked ? (
            <BookmarkCheck size={22} color={EDEN_COLORS.PRIMARY} />
          ) : (
            <Bookmark size={22} color="#8E8E93" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// Add display name for debugging
FriendReviewCard.displayName = 'FriendReviewCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: EDEN_COLORS.PAPER_BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  userNameInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 6,
  },
  mainHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  notes: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  favoriteHoles: {
    fontSize: 14,
    marginBottom: 12,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  interactionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    justifyContent: 'space-between',
  },
  leftInteractions: {
    flexDirection: 'row',
  },
  interactionSpacer: {
    width: 16,
  },
  bookmarkButton: {
    padding: 2,
  },
});

export { FriendReviewCard }; 