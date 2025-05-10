import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, Theme } from './theme';
import { edenTheme, EdenTheme } from './edenTheme';

type ThemeContextType = {
  theme: Theme;
  edenTheme: EdenTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 * 
 * Provides theme access throughout the application.
 * Includes both the legacy theme and the new Eden design system theme.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false); // Force light theme until dark mode is supported

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Use only light theme for now as dark mode is not needed
  const theme = lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, edenTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Use the legacy theme
 * @deprecated Use useEdenTheme instead for new components
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

/**
 * Use the new Eden design system theme
 */
export const useEdenTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useEdenTheme must be used within a ThemeProvider');
  }
  return context.edenTheme;
}; 