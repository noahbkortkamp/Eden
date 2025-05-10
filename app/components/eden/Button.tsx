import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  ActivityIndicator,
  View,
} from 'react-native';
import { useEdenTheme, combineStyles } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'destructive';

export interface ButtonProps extends TouchableOpacityProps {
  /**
   * Button text content
   */
  label: string;
  
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  
  /**
   * Whether the button is in loading state
   */
  loading?: boolean;
  
  /**
   * Icon to display before the label
   */
  startIcon?: React.ReactNode;
  
  /**
   * Icon to display after the label
   */
  endIcon?: React.ReactNode;
  
  /**
   * Whether the button takes full width of its container
   */
  fullWidth?: boolean;
}

/**
 * Button component built with Eden design system
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  fullWidth = false,
  style,
  ...rest
}) => {
  const theme = useEdenTheme();
  const buttonStyles = theme.components.button;
  
  // Determine button style based on variant and state
  const getButtonStyle = () => {
    const baseStyle = buttonStyles[variant];
    const disabledStyle = disabled ? buttonStyles.disabled : null;
    return combineStyles(baseStyle, disabledStyle);
  };
  
  // Determine text style based on variant and state
  const getTextStyle = () => {
    if (variant === 'secondary' || variant === 'tertiary') {
      return styles.secondaryText;
    }
    
    // For success buttons, use primary green text
    if (variant === 'success') {
      return styles.successText;
    }
    
    // For destructive buttons, use error text
    if (variant === 'destructive') {
      return styles.destructiveText;
    }
    
    return styles.primaryText;
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.text.inverse : theme.colors.text.primary}
        />
      ) : (
        <View style={styles.content}>
          {startIcon && <View style={styles.startIcon}>{startIcon}</View>}
          <Text style={[theme.typography.button, getTextStyle()]}>{label}</Text>
          {endIcon && <View style={styles.endIcon}>{endIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#234D2C',
  },
  successText: {
    color: '#234D2C',
  },
  destructiveText: {
    color: '#D84C3E',
  },
  startIcon: {
    marginRight: 8,
  },
  endIcon: {
    marginLeft: 8,
  },
}); 