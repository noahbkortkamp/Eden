import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { likeReview, unlikeReview, hasUserLikedReview, getReviewLikesCount } from '../utils/interactions';
import { useTheme } from '../theme/ThemeProvider';

interface LikeButtonProps {
  reviewId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: number;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  reviewId,
  initialLikeCount = 0,
  initialLiked = false,
  size = 24
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkLikeStatus = async () => {
      if (!user) return;
      
      try {
        const hasLiked = await hasUserLikedReview(reviewId, user.id);
        if (isMounted) setIsLiked(hasLiked);
        
        const count = await getReviewLikesCount(reviewId);
        if (isMounted) setLikesCount(count);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();

    return () => {
      isMounted = false;
    };
  }, [reviewId, user]);

  const handleLikeToggle = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (isLiked) {
        await unlikeReview(reviewId, user.id);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await likeReview(reviewId, user.id);
        setLikesCount(prev => prev + 1);
      }
      
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleLikeToggle}
        disabled={loading || !user}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Heart 
            size={size} 
            color={isLiked ? theme.colors.primary : theme.colors.textSecondary}
            fill={isLiked ? theme.colors.primary : 'transparent'}
          />
        )}
      </TouchableOpacity>
      {likesCount > 0 && (
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
          {likesCount}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    padding: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
}); 