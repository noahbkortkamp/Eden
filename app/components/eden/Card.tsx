import React, { useState, useRef } from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
export const Card: React.FC<CardProps> = React.memo(({
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
  const [isPressed, setIsPressed] = useState(false);
  const lastPressTime = useRef(0);
  
  // Get card style for the selected variant
  const getCardStyle = () => {
    const baseStyle = cardStyles[variant];
    return noPadding 
      ? { ...baseStyle, padding: 0 } 
      : baseStyle;
  };
  
  // Simple debounce for onPress to prevent double presses
  const handlePress = () => {
    const now = Date.now();
    // Prevent rapid re-presses (within 200ms)
    if (now - lastPressTime.current < 200) {
      return;
    }
    lastPressTime.current = now;
    onPress?.();
  };
  
  // Handle press in/out for visual feedback
  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);
  
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
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.wrapper,
          isPressed && styles.pressed
        ]}
        // Add hit slop for better touch target
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        // Remove delay completely for immediate response
        delayPressIn={0}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }
  
  // Otherwise, just return the card content
  return <CardContent />;
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  }
}); 