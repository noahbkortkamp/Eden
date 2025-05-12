/**
 * Eden Design System Colors
 * Centralized color definitions for the Eden app
 */

// Primary brand colors
export const EDEN_GREEN = '#0D4132';
export const EDEN_LIGHT_GREEN = '#9AC979';

// UI Colors 
export const BACKGROUND = '#F8F5EC'; // Creamy off-white background from Eden design system
export const SECONDARY_BACKGROUND = '#FDFBF6'; // Lighter variant for cards, search bar
export const PAPER_BACKGROUND = '#FFFFFF'; // White for cards and content containers 
export const BORDER = '#EFEFEF';
export const WHITE = '#FFFFFF';

// Text colors
export const TEXT = '#000000';
export const TEXT_SECONDARY = '#8E8E93';

// Feedback colors
export const SUCCESS = '#34C759'; // Green for positive ratings (10.0)
export const WARNING = '#FF9500'; // Orange/yellow for mid ratings (6.9) 
export const DANGER = '#FF3B30';  // Red for negative ratings
export const ERROR = '#FF3B30';   // Same as danger for error messages

// Export a consolidated object for easy import
export const EDEN_COLORS = {
  PRIMARY: EDEN_GREEN,
  PRIMARY_LIGHT: EDEN_LIGHT_GREEN,
  BACKGROUND,
  SECONDARY_BACKGROUND,
  PAPER_BACKGROUND,
  BORDER,
  TEXT,
  TEXT_SECONDARY,
  SUCCESS,
  WARNING,
  DANGER,
  ERROR,
  WHITE,
};

export default EDEN_COLORS; 