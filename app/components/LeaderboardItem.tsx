import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEdenTheme } from '../theme';
import { BodyText, SmallText, Card, Avatar, Icon } from './eden';
import type { LeaderboardUser } from '../services/leaderboardService';

interface LeaderboardItemProps {
  user: LeaderboardUser;
  onPress?: () => void;
}

/**
 * Individual leaderboard item component
 * Shows user's rank, avatar, name, and review count
 * Special styling for top 3 positions
 */
export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ user, onPress }) => {
  const theme = useEdenTheme();
  const router = useRouter();

  // Generate initials from user name
  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return 'U';
  };

  // Handle navigation to user profile
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/(modals)/user-profile',
        params: {
          userId: user.id,
          userName: user.full_name || 'User'
        }
      });
    }
  };

  // Get rank badge styling based on position
  const getRankBadgeStyle = () => {
    const baseStyle = {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: theme.spacing.sm,
    };

    switch (user.rank) {
      case 1:
        return {
          ...baseStyle,
          backgroundColor: '#FFD700', // Gold
          borderWidth: 2,
          borderColor: theme.colors.primary,
        };
      case 2:
        return {
          ...baseStyle,
          backgroundColor: '#C0C0C0', // Silver
          borderWidth: 2,
          borderColor: theme.colors.primary,
        };
      case 3:
        return {
          ...baseStyle,
          backgroundColor: '#CD7F32', // Bronze
          borderWidth: 2,
          borderColor: theme.colors.primary,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: theme.colors.background.paper,
          borderWidth: 1,
          borderColor: theme.colors.border.default,
        };
    }
  };

  // Get rank text color based on position
  const getRankTextColor = () => {
    if (user.rank <= 3) {
      return '#FFFFFF'; // White text for top 3
    }
    return theme.colors.text.primary;
  };

  // Get card style based on rank
  const getCardStyle = () => {
    if (user.rank <= 3) {
      return {
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background.paper,
      };
    }
    return {};
  };

  // Get avatar size based on rank
  const getAvatarSize = () => {
    return user.rank === 1 ? 'medium' : 'small';
  };

  return (
    <Card
      variant="listItem"
      pressable
      onPress={handlePress}
      style={[styles.container, getCardStyle()]}
    >
      <View style={styles.content}>
        {/* Rank Badge */}
        <View style={getRankBadgeStyle()}>
          {user.rank <= 3 ? (
            <Icon
              name={user.rank === 1 ? 'Crown' : user.rank === 2 ? 'Medal' : 'Award'}
              size="inline"
              color={getRankTextColor()}
            />
          ) : (
            <BodyText
              style={{
                color: getRankTextColor(),
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {user.rank}
            </BodyText>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Avatar
            source={user.avatar_url ? { uri: user.avatar_url } : undefined}
            fallbackText={getInitials()}
            size={getAvatarSize()}
            style={styles.avatar}
          />
          
          <View style={styles.textInfo}>
            <BodyText
              bold={user.rank <= 3}
              style={[
                styles.userName,
                user.rank === 1 && { fontSize: 16 }
              ]}
            >
              {user.full_name || 'User'}
            </BodyText>
            
            <SmallText
              color={theme.colors.textSecondary}
              style={styles.reviewCount}
            >
              {user.review_count} {user.review_count === 1 ? 'review' : 'reviews'}
            </SmallText>
          </View>
        </View>

        {/* Review Count Badge */}
        <View style={[
          styles.countBadge,
          user.rank <= 3 && styles.topCountBadge
        ]}>
          <BodyText
            style={[
              styles.countText,
              user.rank <= 3 && { color: theme.colors.primary, fontWeight: '600' }
            ]}
          >
            {user.review_count}
          </BodyText>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 8,
  },
  textInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: 1,
  },
  reviewCount: {
    fontSize: 11,
  },
  countBadge: {
    minWidth: 36,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  topCountBadge: {
    backgroundColor: '#E8F4E8',
    borderWidth: 1,
    borderColor: '#9ACE8E',
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 