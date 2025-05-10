import React from 'react';
import { ViewStyle } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useEdenTheme } from '../../theme';

// List all available icon names from Lucide
export type IconName = keyof typeof LucideIcons;

export interface IconProps {
  /**
   * Name of the icon from Lucide icons set
   */
  name: IconName;
  
  /**
   * Icon size, using predefined sizes from the theme
   */
  size?: 'inline' | 'action' | 'navigation' | 'hero' | number;
  
  /**
   * Icon color
   */
  color?: string;
  
  /**
   * Icon stroke width
   */
  strokeWidth?: number;
  
  /**
   * Additional style for the icon container
   */
  style?: ViewStyle;
}

/**
 * Icon component built with Eden design system
 * Uses Lucide icons as specified in the design system
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'action',
  color,
  strokeWidth = 2,
  style,
}) => {
  const theme = useEdenTheme();
  
  // Get icon size from theme if using a named size
  const getIconSize = () => {
    if (typeof size === 'number') {
      return size;
    }
    
    return theme.iconSizes[size];
  };
  
  // Default to primary text color if not specified
  const iconColor = color || theme.colors.text;
  
  // Get the correct icon component from Lucide
  const IconComponent = LucideIcons[name];
  
  if (!IconComponent) {
    console.warn(`Icon ${name} not found in Lucide icons`);
    return null;
  }
  
  return (
    <IconComponent
      size={getIconSize()}
      color={iconColor}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};

/**
 * Helper function to check if a string is a valid IconName
 */
export const isValidIconName = (name: string): name is IconName => {
  return name in LucideIcons;
}; 