import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { getReviewComments } from '../utils/interactions';

interface CommentsButtonProps {
  reviewId: string;
  initialCommentsCount?: number;
  size?: number;
}

export const CommentsButton: React.FC<CommentsButtonProps> = ({
  reviewId,
  initialCommentsCount = 0,
  size = 24
}) => {
  const theme = useTheme();
  const router = useRouter();
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  useEffect(() => {
    let isMounted = true;

    const loadCommentsCount = async () => {
      try {
        const comments = await getReviewComments(reviewId);
        if (isMounted) {
          setCommentsCount(comments.length);
        }
      } catch (error) {
        console.error('Error loading comments count:', error);
      }
    };

    if (initialCommentsCount === 0) {
      loadCommentsCount();
    }

    return () => {
      isMounted = false;
    };
  }, [reviewId, initialCommentsCount]);

  const handlePress = () => {
    router.push({
      pathname: '/review/comments',
      params: { reviewId }
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handlePress}
        style={styles.button}
      >
        <MessageCircle 
          size={size} 
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      {commentsCount > 0 && (
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
          {commentsCount}
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