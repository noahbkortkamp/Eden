import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useEdenTheme } from '../theme/ThemeProvider';
import { BodyText, SmallText } from './eden/Typography';

interface LazyTabWrapperProps {
  children: React.ReactNode;
  isActive: boolean;
  hasBeenActive: boolean;
  onFirstActivation?: () => void;
  tabName: string;
}

// Loading skeleton component for tabs
const TabLoadingSkeleton: React.FC<{ tabName: string }> = ({ tabName }) => {
  const theme = useEdenTheme();
  
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 20
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <BodyText 
        style={{ 
          marginTop: 16, 
          textAlign: 'center',
          color: theme.colors.text 
        }}
      >
        Loading {tabName}...
      </BodyText>
      <SmallText 
        style={{ 
          marginTop: 8, 
          textAlign: 'center',
          color: theme.colors.textSecondary 
        }}
      >
        Preparing your content
      </SmallText>
    </View>
  );
};

export const LazyTabWrapper: React.FC<LazyTabWrapperProps> = React.memo(({
  children,
  isActive,
  hasBeenActive,
  onFirstActivation,
  tabName
}) => {
  useEffect(() => {
    if (isActive && !hasBeenActive && onFirstActivation) {
      console.log(`🚀 LazyTab: First activation of ${tabName} tab`);
      onFirstActivation();
    }
  }, [isActive, hasBeenActive, onFirstActivation, tabName]);

  if (!hasBeenActive) {
    console.log(`⏳ LazyTab: Showing skeleton for ${tabName} tab`);
    return <TabLoadingSkeleton tabName={tabName} />;
  }

  console.log(`✅ LazyTab: Rendering content for ${tabName} tab`);
  return <>{children}</>;
});

LazyTabWrapper.displayName = 'LazyTabWrapper'; 