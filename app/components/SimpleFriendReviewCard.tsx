import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Modal, Dimensions, Image as RNImage, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Heart, MessageCircle, Bookmark, BookmarkCheck, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getSentimentFromRating, SENTIMENT_RANGES } from '../utils/sentiment';
import { toggleLikeReview } from '../utils/interactions';
import { bookmarkService } from '../services/bookmarkService';

// Eden theme colors and styling (directly imported to avoid component conflicts)
const EDEN_COLORS = {
  background: '#FDFBF6',
  text: '#234D2C',
  textSecondary: '#4A5E50',
  primary: '#234D2C',
  border: '#E0E0DC',
  positive: '#9ACE8E',
  neutral: '#F2E7C9',
  negative: '#F6D3D1',
};

const EDEN_TYPOGRAPHY = {
  fontFamily: 'SF Pro Text, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  fontSize: {
    sm: 14,
    md: 16,
    lg: 18,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
};

const EDEN_SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
};

const EDEN_BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

interface SimpleFriendReviewCardProps {
  review: {
    id: string;
    user_id: string;
    course_id: string;
    rating: number;
    relative_score?: number; // The user's comparative ranking score for this course
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

export const SimpleFriendReviewCard: React.FC<SimpleFriendReviewCardProps> = ({ review, onPress }) => {
  const router = useRouter();
  const { user } = useAuth();
  
  // Local state for optimistic updates
  const [likesCount, setLikesCount] = useState(review.likes_count || 0);
  const [isLiked, setIsLiked] = useState(!!review.is_liked_by_me);
  const [isBookmarked, setIsBookmarked] = useState(!!review.is_bookmarked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  
  // Image gallery state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use relative score if available, otherwise fall back to rating for sentiment calculation
  const scoreForSentiment = review.relative_score !== undefined ? review.relative_score : review.rating;
  const sentiment = getSentimentFromRating(scoreForSentiment);
  const sentimentConfig = SENTIMENT_RANGES[sentiment];
  
  // Helper functions
  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return '-';
    return score.toFixed(1);
  };
  
  // Get background color based on score range
  const getScoreBackgroundColor = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return EDEN_COLORS.textSecondary;
    
    if (score >= 7.0) {
      return '#7FB069'; // Medium green matching the screenshot
    } else if (score >= 3.0) {
      return '#D4C5A9'; // Warm beige/tan matching the screenshot
    } else {
      return '#C85A54'; // Red for low scores (keeping this as is)
    }
  };
  
  // Use relative score if available, otherwise fall back to rating
  const displayScore = review.relative_score !== undefined ? review.relative_score : review.rating;
  
  const firstLetter = review.full_name?.charAt(0).toUpperCase() || 'U';
  const hasPlayingPartners = review.playing_partners && review.playing_partners.length > 0;
  const hasPhotos = review.photos && review.photos.length > 0;
  
  // Debug photos
  if (hasPhotos) {
    console.log('📸 Review has photos:', review.photos.length, review.photos);
  }
  
  // Handle like button
  const handleLike = useCallback(async () => {
    if (!user || likeLoading) return;
    
    console.log('🖱️ Like button pressed!');
    setLikeLoading(true);
    
    const originalIsLiked = isLiked;
    const originalLikesCount = likesCount;
    const newIsLiked = !originalIsLiked;
    const newLikesCount = originalIsLiked ? Math.max(0, originalLikesCount - 1) : originalLikesCount + 1;
    
    // Optimistic update
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      await toggleLikeReview(review.id, user.id, originalIsLiked);
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      // Revert on error
      setIsLiked(originalIsLiked);
      setLikesCount(originalLikesCount);
    } finally {
      setLikeLoading(false);
    }
  }, [user, isLiked, likesCount, review.id, likeLoading]);
  
  // Handle comment button
  const handleComment = useCallback(() => {
    console.log('🖱️ Comment button pressed!');
    router.push({
      pathname: '/review/comments',
      params: { reviewId: review.id.toString() }
    });
  }, [router, review.id]);
  
  // Handle bookmark button
  const handleBookmark = useCallback(async () => {
    if (!user || bookmarkLoading) return;
    
    console.log('🖱️ Bookmark button pressed!');
    setBookmarkLoading(true);
    
    const originalIsBookmarked = isBookmarked;
    const newIsBookmarked = !originalIsBookmarked;
    
    // Optimistic update
    setIsBookmarked(newIsBookmarked);
    
    try {
      if (originalIsBookmarked) {
        await bookmarkService.removeBookmark(user.id, review.course_id);
      } else {
        await bookmarkService.addBookmark(user.id, review.course_id);
      }
    } catch (error) {
      console.error('❌ Error toggling bookmark:', error);
      // Revert on error
      setIsBookmarked(originalIsBookmarked);
    } finally {
      setBookmarkLoading(false);
    }
  }, [user, isBookmarked, review.course_id, bookmarkLoading]);
  
  // Handle user profile navigation
  const handleUserPress = useCallback(() => {
    router.push({
      pathname: '/(modals)/user-profile',
      params: {
        userId: review.user_id,
        userName: review.full_name
      }
    });
  }, [router, review.user_id, review.full_name]);
  
  // Handle image gallery
  const openGallery = useCallback((index: number) => {
    console.log('🖼️ Opening gallery at index:', index, 'Total photos:', review.photos?.length);
    setCurrentImageIndex(index);
    setGalleryVisible(true);
  }, [review.photos]);
  
  const closeGallery = useCallback(() => {
    console.log('🖼️ Closing gallery');
    setGalleryVisible(false);
  }, []);
  
  const nextImage = useCallback(() => {
    if (review.photos && currentImageIndex < review.photos.length - 1) {
      console.log('🖼️ Next image:', currentImageIndex + 1);
      setCurrentImageIndex(currentImageIndex + 1);
    }
  }, [currentImageIndex, review.photos]);
  
  const prevImage = useCallback(() => {
    if (currentImageIndex > 0) {
      console.log('🖼️ Previous image:', currentImageIndex - 1);
      setCurrentImageIndex(currentImageIndex - 1);
    }
  }, [currentImageIndex]);
  
  return (
    <View style={styles.container}>
      {/* Main card content - single pressable area for navigation */}
      <Pressable 
        style={({ pressed }) => [
          styles.cardContent,
          pressed && styles.cardPressed
        ]}
        onPress={() => {
          console.log('🖱️ Card navigation pressed!');
          if (onPress) onPress();
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.userInfo} onPress={handleUserPress}>
            {review.avatar_url ? (
              <Image 
                source={{ uri: review.avatar_url }} 
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{firstLetter}</Text>
              </View>
            )}
            <View>
              <Text style={styles.userName}>{review.full_name}</Text>
              <Text style={styles.date}>
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </Pressable>
          
          <View style={[styles.ratingBadge, { backgroundColor: getScoreBackgroundColor(displayScore) }]}>
            <Text style={[
              styles.ratingText, 
              { color: displayScore >= 3.0 && displayScore < 7.0 ? '#2C3E2D' : EDEN_COLORS.background }
            ]}>
              {formatScore(displayScore)}
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.mainHeader} numberOfLines={2}>
            <Text style={styles.userNameInline}>{review.full_name}</Text> played {review.course_name}
            {hasPlayingPartners ? ` with ${review.playing_partners.length} ${review.playing_partners.length === 1 ? 'person' : 'people'}` : ''}
          </Text>
          
          {review.notes && (
            <Text style={styles.notes} numberOfLines={3}>
              {review.notes}
            </Text>
          )}
          
          {review.favorite_holes && review.favorite_holes.length > 0 && (
            <Text style={styles.favoriteHoles}>
              Favorite holes: {review.favorite_holes.join(', ')}
            </Text>
          )}
        </View>
      </Pressable>
      
      {/* Photos - outside of navigation area */}
      {hasPhotos && (
        <View style={styles.photosContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScrollContent}
          >
            {review.photos.map((photo, index) => (
              <Pressable 
                key={`${review.id}-photo-${index}`}
                onPress={() => openGallery(index)}
                style={styles.photoWrapper}
              >
                <Image 
                  source={{ uri: photo }}
                  style={styles.photo}
                  contentFit="cover"
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                  transition={200}
                  onLoad={() => console.log('🖼️ Preview image loaded:', index, photo)}
                  onError={(error) => console.log('🖼️ Preview image error:', error, photo)}
                />
                {review.photos.length > 1 && index === 0 && (
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>
                      1/{review.photos.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Interaction buttons - completely separate area */}
      <View style={styles.interactionsContainer}>
        <View style={styles.leftInteractions}>
          {/* Like Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.interactionButton,
              pressed && styles.interactionPressed
            ]}
            onPress={handleLike}
            disabled={likeLoading || !user}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Heart 
              size={18} 
              color={isLiked ? EDEN_COLORS.primary : EDEN_COLORS.textSecondary}
              fill={isLiked ? EDEN_COLORS.primary : 'transparent'}
            />
            {likesCount > 0 && (
              <Text style={styles.interactionCount}>{likesCount}</Text>
            )}
          </Pressable>
          
          {/* Comment Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.interactionButton,
              pressed && styles.interactionPressed
            ]}
            onPress={handleComment}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MessageCircle size={18} color={EDEN_COLORS.textSecondary} />
            {review.comments_count > 0 && (
              <Text style={styles.interactionCount}>{review.comments_count}</Text>
            )}
          </Pressable>
        </View>
        
        {/* Bookmark Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.interactionButton,
            pressed && styles.interactionPressed
          ]}
          onPress={handleBookmark}
          disabled={bookmarkLoading || !user}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {isBookmarked ? (
            <BookmarkCheck size={18} color={EDEN_COLORS.primary} />
          ) : (
            <Bookmark size={18} color={EDEN_COLORS.textSecondary} />
          )}
        </Pressable>
      </View>
      
      {/* Image Gallery Modal */}
      <Modal
        visible={galleryVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGallery}
        statusBarTranslucent={true}
      >
        <View style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Pressable onPress={closeGallery} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color="white" />
            </Pressable>
            {review.photos && review.photos.length > 1 && (
              <Text style={styles.galleryCounter}>
                {currentImageIndex + 1} / {review.photos.length}
              </Text>
            )}
          </View>
          
          <View style={styles.galleryContent}>
            <FlatList
              data={review.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                console.log('🖼️ Scrolled to image index:', index);
                setCurrentImageIndex(index);
              }}
              renderItem={({ item: photo, index }) => (
                <View style={styles.galleryImageContainer}>
                  <RNImage
                    source={{ uri: photo }}
                    style={styles.galleryImage}
                    resizeMode="contain"
                    onLoad={() => console.log('🖼️ Gallery image loaded:', index, photo)}
                    onError={(error) => console.log('🖼️ Gallery image error:', error, photo)}
                  />
                </View>
              )}
              keyExtractor={(item, index) => `gallery-${index}`}
              getItemLayout={(data, index) => ({
                length: Dimensions.get('window').width,
                offset: Dimensions.get('window').width * index,
                index,
              })}
              initialScrollIndex={currentImageIndex}
            />
          </View>
          
          {review.photos && review.photos.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <Pressable 
                  onPress={prevImage} 
                  style={[styles.navButton, styles.prevButton]}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <View style={styles.navButtonBackground}>
                    <ChevronLeft size={24} color="white" />
                  </View>
                </Pressable>
              )}
              {currentImageIndex < review.photos.length - 1 && (
                <Pressable 
                  onPress={nextImage} 
                  style={[styles.navButton, styles.nextButton]}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <View style={styles.navButtonBackground}>
                    <ChevronRight size={24} color="white" />
                  </View>
                </Pressable>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: EDEN_COLORS.background,
    borderRadius: EDEN_BORDER_RADIUS.md,
    marginBottom: EDEN_SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    padding: EDEN_SPACING.sm,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: EDEN_SPACING.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: EDEN_SPACING.xs,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: EDEN_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: EDEN_SPACING.xs,
  },
  avatarText: {
    color: 'white',
    fontSize: EDEN_TYPOGRAPHY.fontSize.sm,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.semiBold,
  },
  userName: {
    fontSize: EDEN_TYPOGRAPHY.fontSize.sm,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.semiBold,
    color: EDEN_COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: EDEN_COLORS.textSecondary,
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: EDEN_BORDER_RADIUS.full,
    minWidth: 44,
    minHeight: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: EDEN_TYPOGRAPHY.fontSize.sm,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.bold,
    color: EDEN_COLORS.background,
    letterSpacing: 0.3,
  },
  content: {
    marginBottom: EDEN_SPACING.xs,
  },
  mainHeader: {
    fontSize: EDEN_TYPOGRAPHY.fontSize.md,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.semiBold,
    color: EDEN_COLORS.text,
    marginBottom: EDEN_SPACING.xs,
    lineHeight: 20,
  },
  userNameInline: {
    color: EDEN_COLORS.primary,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.bold,
  },
  notes: {
    fontSize: EDEN_TYPOGRAPHY.fontSize.sm,
    color: EDEN_COLORS.text,
    lineHeight: 18,
    marginBottom: EDEN_SPACING.xs,
  },
  favoriteHoles: {
    fontSize: 12,
    color: EDEN_COLORS.textSecondary,
    marginBottom: EDEN_SPACING.xs,
  },
  photosContainer: {
    marginBottom: EDEN_SPACING.xs,
  },
  photosScrollContent: {
    paddingHorizontal: EDEN_SPACING.sm,
  },
  photoWrapper: {
    marginRight: EDEN_SPACING.xs,
    backgroundColor: '#f0f0f0',
    borderRadius: EDEN_BORDER_RADIUS.sm,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: EDEN_BORDER_RADIUS.sm,
    backgroundColor: '#e0e0e0',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.medium,
    color: 'white',
  },
  interactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: EDEN_SPACING.sm,
    paddingVertical: EDEN_SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: EDEN_COLORS.border,
  },
  leftInteractions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: EDEN_SPACING.xs,
    marginRight: EDEN_SPACING.sm,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
  },
  interactionPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  interactionCount: {
    fontSize: 12,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.medium,
    color: EDEN_COLORS.textSecondary,
    marginLeft: 3,
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: EDEN_SPACING.sm,
    paddingTop: 50, // Account for status bar
    zIndex: 1000,
  },
  closeButton: {
    padding: EDEN_SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  galleryCounter: {
    fontSize: 18,
    fontWeight: EDEN_TYPOGRAPHY.fontWeight.bold,
    color: 'white',
  },
  galleryContent: {
    flex: 1,
    position: 'relative',
  },
  galleryImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  galleryImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 140,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 1000,
    transform: [{ translateY: -25 }],
  },
  navButtonBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: EDEN_SPACING.sm,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
}); 