/**
 * Eden Design System Tokens
 * Inspired by Augusta National and the Eden brand - clean, classic, nature-infused.
 */

/**
 * Color Palette
 */
export const colors = {
  // Base Colors
  background: {
    base: '#F8F5EC', // Creamy off-white (primary background)
    paper: '#FDFBF6', // Lighter variant for cards, modals
    focused: '#FDFBF6', // Background for focused elements
    disabled: '#F5F3ED', // Background for disabled elements
    error: '#FFF6F5', // Background for error states
  },
  text: {
    primary: '#234D2C', // Deep Masters green (titles, headings)
    secondary: '#4A5E50', // Muted green-gray (descriptive labels)
    disabled: '#A7A7A2', // Disabled text color
    error: '#D84C3E', // Error text color
    inverse: '#FFFFFF', // White text for dark backgrounds
  },
  accent: {
    primary: '#234D2C', // Primary accent - deep Masters green
    focused: '#2E6338', // Slightly lighter for hover/focus states
  },
  feedback: {
    positive: '#9ACE8E', // Light green (for "Liked" status)
    neutral: '#F2E7C9', // Beige-yellow (for "Fine" status)
    negative: '#F6D3D1', // Soft red-pink (for "Didn't Like" status)
  },
  border: {
    default: '#E0E0DC', // Default border color
    accent: '#234D2C', // Primary border color
    focused: '#234D2C', // Border for focused elements 
    error: '#D84C3E', // Border for error states
    disabled: '#E0E0DC', // Border for disabled elements
  },
};

/**
 * Typography
 */
export const typography = {
  fontFamily: {
    display: 'SF Pro Display, Inter, -apple-system, BlinkMacSystemFont, sans-serif', // For headers
    text: 'SF Pro Text, Inter, -apple-system, BlinkMacSystemFont, sans-serif', // For body text
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  fontSize: {
    xxs: 10, // Tab labels, captions
    xs: 12, // Tags, metadata
    sm: 14, // Button text, smaller body text
    md: 16, // Standard body text
    lg: 18, // Larger body text, smaller section titles
    xl: 20, // Section titles
    xxl: 24, // App titles, headers
  },
};

/**
 * Spacing
 */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border Radius
 */
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/**
 * Shadows
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

/**
 * Icon Sizes
 */
export const iconSizes = {
  inline: 16, // Inline text icons
  action: 24, // Action buttons
  navigation: 28, // Card & UI navigation
  hero: 40, // Hero/empty state icons
};

/**
 * Component Style Tokens
 */
export const componentTokens = {
  // Input fields
  input: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  
  // Buttons
  button: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  
  // Cards
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
}; 