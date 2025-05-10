import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  iconSizes,
  componentTokens
} from './tokens';

/**
 * Eden Design System Theme
 * 
 * This is the main theme configuration object that combines all the tokens
 * into a structured theme that can be consumed by components.
 */
export const edenTheme = {
  colors: {
    // Core background colors
    background: colors.background.base,
    surface: colors.background.paper,
    
    // Text colors
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    
    // Core brand & interaction colors
    primary: colors.accent.primary,
    primaryFocused: colors.accent.focused,
    
    // Feedback colors
    success: colors.feedback.positive,
    warning: colors.feedback.neutral,
    error: colors.feedback.negative,
    
    // Border colors
    border: colors.border.default,
    
    // Status-specific colors
    liked: colors.feedback.positive,
    neutral: colors.feedback.neutral,
    disliked: colors.feedback.negative,
  },
  
  // Typography styles - combines font family, weight, and size
  typography: {
    // Headers
    h1: {
      fontFamily: typography.fontFamily.display,
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
    },
    h2: {
      fontFamily: typography.fontFamily.display,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
    },
    h3: {
      fontFamily: typography.fontFamily.display,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    
    // Body text
    body: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.regular,
      color: colors.text.primary,
    },
    bodySmall: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.regular,
      color: colors.text.secondary,
    },
    
    // Special text styles
    caption: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.regular,
      color: colors.text.secondary,
    },
    button: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.inverse,
    },
    buttonSecondary: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.accent.primary,
    },
    tag: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
    },
    tabLabel: {
      fontFamily: typography.fontFamily.text,
      fontSize: typography.fontSize.xxs,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
  },
  
  // Spacing values
  spacing,
  
  // Border radius values
  borderRadius,
  
  // Shadow styles
  shadows,
  
  // Icon sizes
  iconSizes,
  
  // Component-specific styles
  components: {
    // Button variants
    button: {
      // Primary button (solid green)
      primary: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
        color: colors.text.inverse,
        ...componentTokens.button,
      },
      // Secondary button (outline)
      secondary: {
        backgroundColor: 'transparent',
        borderColor: colors.accent.primary,
        color: colors.accent.primary,
        ...componentTokens.button,
      },
      // Tertiary/ghost button (text only)
      tertiary: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: colors.accent.primary,
        ...componentTokens.button,
        borderWidth: 0,
      },
      // Success button
      success: {
        backgroundColor: colors.feedback.positive,
        borderColor: colors.feedback.positive,
        color: colors.accent.primary,
        ...componentTokens.button,
      },
      // Destructive button
      destructive: {
        backgroundColor: colors.feedback.negative,
        borderColor: colors.feedback.negative,
        color: colors.text.error,
        ...componentTokens.button,
      },
      // Disabled state (applies to all button types)
      disabled: {
        opacity: 0.6,
        backgroundColor: colors.background.disabled,
        borderColor: colors.border.disabled,
        color: colors.text.disabled,
      },
    },
    
    // Input field styles
    input: {
      // Default state
      default: {
        backgroundColor: colors.background.paper,
        borderColor: colors.border.default,
        color: colors.text.primary,
        ...componentTokens.input,
      },
      // Focused state
      focused: {
        backgroundColor: colors.background.focused,
        borderColor: colors.border.focused,
        borderWidth: 1.5,
      },
      // Error state
      error: {
        backgroundColor: colors.background.error,
        borderColor: colors.border.error,
        borderWidth: 1.5,
      },
      // Disabled state
      disabled: {
        backgroundColor: colors.background.disabled,
        borderColor: colors.border.disabled,
        color: colors.text.disabled,
        opacity: 0.6,
      },
    },
    
    // Card styles
    card: {
      // Default card
      default: {
        backgroundColor: colors.background.paper,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...shadows.sm,
      },
      // Course card
      course: {
        backgroundColor: colors.background.paper,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...shadows.sm,
      },
      // List item card (more compact)
      listItem: {
        backgroundColor: colors.background.paper,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        ...shadows.sm,
      },
      // Profile card
      profile: {
        backgroundColor: colors.background.paper,
        borderRadius: borderRadius.lg,
        borderColor: colors.accent.primary,
        borderWidth: 1,
        padding: spacing.md,
        ...shadows.md,
      },
    },
  },
} as const;

// Type for the Eden theme
export type EdenTheme = typeof edenTheme; 