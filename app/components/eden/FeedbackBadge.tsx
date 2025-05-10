import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useEdenTheme } from '../../theme';
import { Typography } from './Typography';

export type FeedbackStatus = 'positive' | 'neutral' | 'negative';

export interface FeedbackBadgeProps {
  /**
   * The feedback status to display
   */
  status: FeedbackStatus;
  
  /**
   * Custom label to override the default text
   */
  label?: string;
  
  /**
   * Icon to display before the text
   */
  icon?: React.ReactNode;
  
  /**
   * Style for the badge container
   */
  style?: ViewStyle;
  
  /**
   * Whether to use a small variant
   */
  small?: boolean;
}

/**
 * FeedbackBadge component built with Eden design system
 * Used to display a user's feedback status (Liked, Fine, Didn't Like)
 */
export const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({
  status,
  label,
  icon,
  style,
  small = false,
}) => {
  const theme = useEdenTheme();
  
  // Determine background color based on status
  const getBackgroundColor = () => {
    switch (status) {
      case 'positive':
        return theme.colors.liked;
      case 'neutral':
        return theme.colors.neutral;
      case 'negative':
        return theme.colors.disliked;
      default:
        return theme.colors.neutral;
    }
  };
  
  // Determine text based on status
  const getDefaultLabel = () => {
    switch (status) {
      case 'positive':
        return 'Liked';
      case 'neutral':
        return 'Fine';
      case 'negative':
        return 'Didn\'t Like';
      default:
        return '';
    }
  };
  
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: getBackgroundColor() },
        small ? styles.smallBadge : styles.normalBadge,
        style,
      ]}
    >
      {icon && (
        <View style={styles.icon}>
          {icon}
        </View>
      )}
      <Typography
        variant={small ? "caption" : "tag"}
        color={theme.colors.text.primary}
      >
        {label || getDefaultLabel()}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  normalBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  smallBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 4,
  },
}); 