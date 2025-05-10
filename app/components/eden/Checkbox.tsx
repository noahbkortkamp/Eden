import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useEdenTheme } from '../../theme';
import { BodyText, SmallText } from './Typography';
import { Icon } from './Icon';

export interface CheckboxProps {
  /**
   * Whether the checkbox is checked
   */
  checked: boolean;
  
  /**
   * Function to call when the checkbox is toggled
   */
  onToggle: () => void;
  
  /**
   * Label text to display next to the checkbox
   */
  label?: string;
  
  /**
   * Helper text to show below the label
   */
  helperText?: string;
  
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
  
  /**
   * Size of the checkbox
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Container style
   */
  style?: ViewStyle;
}

/**
 * Checkbox component built with Eden design system
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onToggle,
  label,
  helperText,
  disabled = false,
  size = 'medium',
  style,
}) => {
  const theme = useEdenTheme();
  
  // Get checkbox size based on the size prop
  const getCheckboxSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 24;
      case 'medium':
      default:
        return 20;
    }
  };
  
  // Get checkbox style based on state
  const getCheckboxStyle = () => {
    const checkboxSize = getCheckboxSize();
    
    return {
      width: checkboxSize,
      height: checkboxSize,
      borderRadius: 4,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: disabled 
        ? theme.colors.border.disabled 
        : checked 
          ? theme.colors.primary 
          : theme.colors.border.default,
      backgroundColor: disabled
        ? theme.colors.background.disabled
        : checked
          ? theme.colors.primary
          : 'transparent',
    };
  };
  
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ 
        checked, 
        disabled 
      }}
    >
      <View style={[getCheckboxStyle()]}>
        {checked && (
          <Icon
            name="Check"
            size={getCheckboxSize() * 0.7}
            color={theme.colors.text.inverse}
            strokeWidth={2.5}
          />
        )}
      </View>
      
      {(label || helperText) && (
        <View style={styles.labelContainer}>
          {label && (
            <BodyText
              color={disabled ? theme.colors.text.disabled : undefined}
            >
              {label}
            </BodyText>
          )}
          
          {helperText && (
            <SmallText
              color={disabled ? theme.colors.text.disabled : theme.colors.textSecondary}
            >
              {helperText}
            </SmallText>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  labelContainer: {
    marginLeft: 12,
    flex: 1,
  },
}); 