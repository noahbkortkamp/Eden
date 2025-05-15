import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { useEdenTheme } from '../../theme';

export type AvatarSize = 'small' | 'medium' | 'large';

export interface AvatarProps {
  /**
   * Image source for the avatar
   */
  source?: ImageSourcePropType;
  
  /**
   * Size of the avatar
   */
  size?: AvatarSize;
  
  /**
   * Text to display when no image is available
   */
  fallbackText?: string;
  
  /**
   * Additional style for the avatar
   */
  style?: any;
}

/**
 * Avatar component for user profiles
 */
export const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 'medium',
  fallbackText = 'U',
  style,
}) => {
  const theme = useEdenTheme();
  
  // Size mapping
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 64,
  };
  
  const fontSize = {
    small: 14,
    medium: 20,
    large: 26,
  };
  
  const avatarSize = sizeMap[size];
  
  return (
    <View
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
          backgroundColor: source ? 'transparent' : theme.colors.primary,
          borderRadius: avatarSize / 2,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }}
        />
      ) : (
        <Text
          style={{
            color: 'white',
            fontSize: fontSize[size],
            fontWeight: '500',
          }}
        >
          {fallbackText.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
}); 