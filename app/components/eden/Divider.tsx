import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useEdenTheme } from '../../theme';

export interface DividerProps {
  /**
   * Vertical padding around the divider
   */
  spacing?: 'none' | 'small' | 'medium' | 'large';
  
  /**
   * Additional style for the divider
   */
  style?: any;
}

/**
 * Divider component for separating content
 */
export const Divider: React.FC<DividerProps> = ({
  spacing = 'none',
  style,
}) => {
  const theme = useEdenTheme();
  
  // Spacing mapping
  const spacingMap = {
    none: 0,
    small: 4,
    medium: 8,
    large: 16,
  };
  
  return (
    <View
      style={[
        styles.divider,
        {
          borderBottomColor: theme.colors.border,
          marginVertical: spacingMap[spacing],
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    borderBottomWidth: 1,
    width: '100%',
  },
}); 