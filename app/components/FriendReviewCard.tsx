import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { useTheme } from '../theme/ThemeProvider';
import { ThumbsUp, ThumbsDown, Minus, Share } from 'lucide-react-native';

// Define rating sentiment icons/colors
const RATING_CONFIGS = {
  liked: { icon: ThumbsUp, color: '#22c55e' },
  fine: { icon: Minus, color: '#f59e0b' },
  didnt_like: { icon: ThumbsDown, color: '#ef4444' }
};

interface FriendReviewCardProps {
  review: {
    id: string;
    user_id: string;
    course_id: string;
    rating: 'liked' | 'fine' | 'didnt_like';
    notes?: string | null;
    date_played: string;
    created_at: string;
    full_name: string;
    avatar_url?: string | null;
    course_name: string;
    course_location: string;
  };
  onPress?: () => void;
}

export const FriendReviewCard: React.FC<FriendReviewCardProps> = ({ review, onPress }) => {
  const theme = useTheme();
  const ratingConfig = RATING_CONFIGS[review.rating];
  const RatingIcon = ratingConfig.icon;
  
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
        
        <View style={[styles.ratingBadge, { backgroundColor: ratingConfig.color + '20' }]}>
          <RatingIcon size={16} color={ratingConfig.color} />
          <Text style={[styles.ratingText, { color: ratingConfig.color }]}>
            {review.rating === 'liked' ? 'Liked it' : 
             review.rating === 'fine' ? 'It was fine' : 
             "Didn't like it"}
          </Text>
        </View>
      </View>
      
      <View style={styles.courseInfo}>
        <Text style={[styles.courseName, { color: theme.colors.text }]}>
          {review.course_name}
        </Text>
        <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
          {review.course_location}
        </Text>
      </View>
      
      {review.notes && (
        <Text style={[styles.notes, { color: theme.colors.text }]}>
          {review.notes}
        </Text>
      )}
      
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    marginBottom: 8,
  },
  courseName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  courseLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  notes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  playedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  shareButton: {
    padding: 4,
  },
}); 