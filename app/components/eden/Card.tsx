import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity } from 'react-native';
import { useEdenTheme } from '../../theme';

export type CardVariant = 'default' | 'course' | 'listItem' | 'profile';

export interface CardProps extends ViewProps {
  /**
   * Card variant to use
   */
  variant?: CardVariant;
  
  /**
   * Whether the card is pressable
   */
  pressable?: boolean;
  
  /**
   * Function to call when the card is pressed
   */
  onPress?: () => void;

  /**
   * Whether to remove padding (useful when card contains content that provides its own padding)
   */
  noPadding?: boolean;
}

/**
 * Card component built with Eden design system
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  pressable = false,
  onPress,
  noPadding = false,
  style,
  children,
  ...rest
}) => {
  const theme = useEdenTheme();
  const cardStyles = theme.components.card;
  
  // Get card style for the selected variant
  const getCardStyle = () => {
    const baseStyle = cardStyles[variant];
    return noPadding 
      ? { ...baseStyle, padding: 0 } 
      : baseStyle;
  };
  
  // Create the inner content of the card
  const CardContent = () => (
    <View
      style={[
        getCardStyle(),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
  
  // If the card is pressable, wrap it in a TouchableOpacity
  if (pressable && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.wrapper}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }
  
  // Otherwise, just return the card content
  return <CardContent />;
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
}); 