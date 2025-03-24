import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeProvider';
import { ThumbsUp, ThumbsDown, Minus, Share, MapPin, Users } from 'lucide-react-native';

// Define sentiment ranges with their colors and icons
const SENTIMENT_RANGES = {
  liked: { min: 7.0, max: 10.0, color: '#22c55e', icon: ThumbsUp },
  fine: { min: 3.0, max: 6.9, color: '#f59e0b', icon: Minus },
  didnt_like: { min: 0.0, max: 2.9, color: '#ef4444', icon: ThumbsDown }
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
  };
  onPress?: () => void;
}

export const FriendReviewCard: React.FC<FriendReviewCardProps> = ({ review, onPress }) => {
  const theme = useTheme();
  // Use the numeric rating to determine sentiment and styling
  const sentiment = getSentimentFromRating(review.rating);
  const sentimentConfig = SENTIMENT_RANGES[sentiment];
  const RatingIcon = sentimentConfig.icon;
  const town = getTownFromLocation(review.course_location);
  
  // Debug timestamp to verify fresh data
  const timestamp = new Date().toISOString();
  const lastFourChars = timestamp.substring(timestamp.length - 7, timestamp.length - 3);
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.avatar_url ? (
            <Image 
              source={{ uri: review.avatar_url }} 
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
              <Text style={styles.avatarText}>
                {review.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {review.full_name}
            </Text>
            <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
              {format(new Date(review.created_at), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        
        <View style={[styles.ratingBadge, { backgroundColor: sentimentConfig.color + '20' }]}>
          <RatingIcon size={16} color={sentimentConfig.color} />
          <Text style={[styles.ratingText, { color: sentimentConfig.color }]}>
            {formatRating(review.rating)}
            <Text style={{fontSize: 8, opacity: 0.6}}>{" "}{lastFourChars}</Text>
          </Text>
        </View>
      </View>
      
      <View style={styles.courseInfo}>
        <Text style={[styles.courseName, { color: theme.colors.text }]}>
          {review.course_name}
        </Text>
        <View style={styles.locationContainer}>
          <MapPin size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
            {town}
          </Text>
        </View>
      </View>

      {/* Playing Partners Section */}
      {review.playing_partners && review.playing_partners.length > 0 ? (
        <View style={styles.partnersSection}>
          <View style={styles.partnersHeader}>
            <Users size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.partnersTitle, { color: theme.colors.textSecondary }]}>
              Played with {review.playing_partners.length} {review.playing_partners.length === 1 ? 'person' : 'people'}
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.partnersList}
          >
            {review.playing_partners.map((partner) => (
              <View key={partner.id} style={styles.partnerItem}>
                {partner.avatar_url ? (
                  <Image 
                    source={{ uri: partner.avatar_url }} 
                    style={styles.partnerAvatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.partnerAvatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={styles.partnerAvatarText}>
                      {partner.full_name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.partnerName, { color: theme.colors.text }]}>
                  {partner.full_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <Text style={[styles.soloPlayText, { color: theme.colors.textSecondary }]}>
          {review.full_name} played {review.course_name}
        </Text>
      )}

      {/* Photos Section */}
      {review.photos && review.photos.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.photosContainer}
        >
          {review.photos.map((photo, index) => (
            <Image 
              key={index}
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      )}
      
      {/* Review Content */}
      <View style={styles.contentSection}>
        {review.notes && (
          <Text style={[styles.notes, { color: theme.colors.text }]}>
            {review.notes}
          </Text>
        )}
        
        {review.favorite_holes && review.favorite_holes.length > 0 && (
          <View style={styles.favoriteHolesContainer}>
            <Text style={[styles.favoriteHolesTitle, { color: theme.colors.textSecondary }]}>
              Favorite holes: {review.favorite_holes.join(', ')}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.playedDate, { color: theme.colors.textSecondary }]}>
          Played on {format(new Date(review.date_played), 'MMM d, yyyy')}
        </Text>
        
        <TouchableOpacity style={styles.shareButton}>
          <Share size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  date: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  courseInfo: {
    marginBottom: 12,
  },
  courseName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  partnersSection: {
    marginBottom: 12,
  },
  partnersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnersTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  partnersList: {
    flexDirection: 'row',
  },
  partnerItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  partnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  partnerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  partnerName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  soloPlayText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
  contentSection: {
    marginBottom: 12,
  },
  notes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  favoriteHolesContainer: {
    marginTop: 4,
  },
  favoriteHolesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  shareButton: {
    padding: 4,
  },
}); 