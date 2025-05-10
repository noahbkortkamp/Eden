/**
 * Eden Design System
 * 
 * This file serves as the main entry point for the Eden design system.
 * It exports all theme-related components, hooks, and types.
 */

// Export the theme provider and hooks
export { ThemeProvider, useTheme, useEdenTheme } from './ThemeProvider';

// Export the legacy theme (for backward compatibility)
export { lightTheme, darkTheme, Theme } from './theme';

// Export the new Eden theme
export { edenTheme, EdenTheme } from './edenTheme';

// Export the tokens for direct access if needed
export {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  iconSizes,
  componentTokens
} from './tokens';

// Export utility functions
export {
  createStyles,
  getTextStyle,
  getButtonStyle,
  getCardStyle,
  getInputStyle,
  combineStyles
} from './utils';

// Type helpers
export type ColorToken = typeof colors;
export type SpacingToken = typeof spacing;
export type TypographyToken = typeof typography;
export type BorderRadiusToken = typeof borderRadius;
export type ShadowToken = typeof shadows; 