import { StyleSheet } from 'react-native';
import { edenTheme } from './edenTheme';

/**
 * Eden Design System Utilities
 *
 * Helper functions to simplify working with the Eden design system.
 */

/**
 * Creates styles with proper typing based on the Eden theme
 */
export const createStyles = StyleSheet.create;

/**
 * Returns a text style object for the given typography variant
 */
export const getTextStyle = (variant: keyof typeof edenTheme.typography) => {
  return edenTheme.typography[variant];
};

/**
 * Returns a button style object for the given button variant
 */
export const getButtonStyle = (variant: keyof typeof edenTheme.components.button) => {
  return edenTheme.components.button[variant];
};

/**
 * Returns a card style object for the given card variant
 */
export const getCardStyle = (variant: keyof typeof edenTheme.components.card) => {
  return edenTheme.components.card[variant];
};

/**
 * Returns an input style object for the given input state
 */
export const getInputStyle = (variant: keyof typeof edenTheme.components.input) => {
  return edenTheme.components.input[variant];
};

/**
 * Combines multiple styles safely
 */
export const combineStyles = <T>(...styles: (T | undefined | null | false)[]) => {
  return styles.filter(Boolean) as T[];
}; 