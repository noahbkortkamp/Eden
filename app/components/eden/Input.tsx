import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useEdenTheme, combineStyles } from '../../theme';

export interface InputProps extends TextInputProps {
  /**
   * Label text shown above the input
   */
  label?: string;
  
  /**
   * Helper text shown below the input
   */
  helperText?: string;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Icon to show at the start of the input
   */
  startIcon?: React.ReactNode;
  
  /**
   * Icon to show at the end of the input
   */
  endIcon?: React.ReactNode;
  
  /**
   * Function to call when the end icon is pressed
   */
  onEndIconPress?: () => void;
  
  /**
   * Container style
   */
  containerStyle?: ViewStyle;
}

/**
 * Input component built with Eden design system
 */
export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  startIcon,
  endIcon,
  onEndIconPress,
  style,
  containerStyle,
  disabled = false,
  ...rest
}) => {
  const theme = useEdenTheme();
  const inputStyles = theme.components.input;
  
  // Track focus state
  const [isFocused, setIsFocused] = useState(false);
  
  // Determine input state
  const getInputState = () => {
    if (disabled) return 'disabled';
    if (error) return 'error';
    if (isFocused) return 'focused';
    return 'default';
  };
  
  // Get style based on input state
  const getInputStyle = () => {
    const state = getInputState();
    const baseStyle = inputStyles.default;
    const stateStyle = state !== 'default' ? inputStyles[state] : null;
    return combineStyles(baseStyle, stateStyle);
  };
  
  // Handle focus event
  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (rest.onFocus) {
      rest.onFocus(e);
    }
  };
  
  // Handle blur event
  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (rest.onBlur) {
      rest.onBlur(e);
    }
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[theme.typography.bodySmall, styles.label]}>
          {label}
        </Text>
      ) : null}
      
      <View style={[styles.inputContainer, getInputStyle()]}>
        {startIcon ? (
          <View style={styles.startIcon}>{startIcon}</View>
        ) : null}
        
        <TextInput
          style={[
            styles.input,
            startIcon && styles.inputWithStartIcon,
            endIcon && styles.inputWithEndIcon,
            style,
          ]}
          placeholderTextColor={theme.colors.text.secondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          {...rest}
        />
        
        {endIcon ? (
          <TouchableOpacity
            style={styles.endIcon}
            onPress={onEndIconPress}
            disabled={!onEndIconPress}
          >
            {endIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      
      {(error || helperText) ? (
        <Text
          style={[
            theme.typography.caption,
            styles.helperText,
            error ? styles.errorText : null,
          ]}
        >
          {error || helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    height: '100%',
  },
  inputWithStartIcon: {
    paddingLeft: 0,
  },
  inputWithEndIcon: {
    paddingRight: 0,
  },
  startIcon: {
    marginRight: 8,
  },
  endIcon: {
    marginLeft: 8,
  },
  helperText: {
    marginTop: 6,
  },
  errorText: {
    color: '#D84C3E',
  },
}); 