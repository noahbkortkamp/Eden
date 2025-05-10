import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useEdenTheme } from '../../theme';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'tag' | 'tabLabel';

export interface TypographyProps extends TextProps {
  /**
   * Typography variant to use
   */
  variant?: TypographyVariant;
  
  /**
   * Whether the text should be centered
   */
  center?: boolean;
  
  /**
   * Whether the text should be bold
   * This overrides the font weight defined in the variant
   */
  bold?: boolean;
  
  /**
   * Optional color override
   */
  color?: string;
}

/**
 * Typography component built with Eden design system
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  style,
  center = false,
  bold = false,
  color,
  children,
  ...rest
}) => {
  const theme = useEdenTheme();
  
  // Get the typography style for the selected variant
  const getTypographyStyle = () => {
    return theme.typography[variant];
  };
  
  return (
    <Text
      style={[
        getTypographyStyle(),
        center && styles.center,
        bold && styles.bold,
        color ? { color } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

// Convenience components for common typography variants
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const BodyText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const SmallText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodySmall" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Tag: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="tag" {...props} />
);

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
}); 