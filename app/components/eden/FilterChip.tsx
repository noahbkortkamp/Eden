import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useEdenTheme } from '../../theme';
import { SmallText } from './Typography';
import { Icon } from './Icon';

export interface FilterChipProps {
  /**
   * Label text to display in the chip
   */
  label: string;
  
  /**
   * Whether the chip is selected
   */
  selected?: boolean;
  
  /**
   * Function to call when the chip is toggled
   */
  onToggle: () => void;
  
  /**
   * Icon name to display before the label
   */
  icon?: string;
  
  /**
   * Whether the chip is disabled
   */
  disabled?: boolean;
  
  /**
   * Container style
   */
  style?: ViewStyle;
}

/**
 * FilterChip component built with Eden design system
 * Used for selectable filter options
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected = false,
  onToggle,
  icon,
  disabled = false,
  style,
}) => {
  const theme = useEdenTheme();
  
  // Background color based on state
  const getBackgroundColor = () => {
    if (disabled) {
      return theme.colors.background.disabled;
    }
    
    return selected ? theme.colors.primary : theme.colors.background.paper;
  };
  
  // Text color based on state
  const getTextColor = () => {
    if (disabled) {
      return theme.colors.text.disabled;
    }
    
    return selected ? theme.colors.text.inverse : theme.colors.textSecondary;
  };
  
  // Border color based on state
  const getBorderColor = () => {
    if (disabled) {
      return theme.colors.border.disabled;
    }
    
    return selected ? theme.colors.primary : theme.colors.border.default;
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ 
        selected, 
        disabled 
      }}
    >
      {icon && (
        <Icon
          name={icon as any}
          size="inline"
          color={getTextColor()}
          style={styles.icon}
        />
      )}
      
      <SmallText color={getTextColor()}>
        {label}
      </SmallText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
  },
  icon: {
    marginRight: 4,
  },
}); 