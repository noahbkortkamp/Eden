import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ViewStyle } from 'react-native';
import { useEdenTheme } from '../../theme';
import { BodyText } from './Typography';
import { Icon } from './Icon';

export type TabRoute = {
  key: string;
  title: string;
  icon?: string;
};

export interface TabsProps {
  /**
   * List of tab routes to display
   */
  routes: TabRoute[];
  
  /**
   * Currently selected tab index
   */
  selectedIndex?: number;
  
  /**
   * Function called when a tab is selected
   */
  onIndexChange: (index: number) => void;
  
  /**
   * Function that renders the content for each tab
   */
  renderScene: (route: TabRoute, index: number) => React.ReactNode;
  
  /**
   * Whether the tabs should be scrollable horizontally
   */
  scrollable?: boolean;
  
  /**
   * Container style for the tab bar
   */
  tabBarStyle?: ViewStyle;
  
  /**
   * Container style for the content area
   */
  contentContainerStyle?: ViewStyle;
  
  /**
   * Container style for the tabs component
   */
  style?: ViewStyle;
}

/**
 * Tabs component built with Eden design system
 * Used for tabbed navigation between different views
 */
export const Tabs: React.FC<TabsProps> = ({
  routes,
  selectedIndex = 0,
  onIndexChange,
  renderScene,
  scrollable = false,
  tabBarStyle,
  contentContainerStyle,
  style,
}) => {
  const theme = useEdenTheme();
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  
  // Calculate tab width based on whether tabs are scrollable
  const getTabWidth = () => {
    if (scrollable) {
      return { minWidth: 120 }; // Scrollable tabs have minimum width
    }
    
    // Fixed tabs take equal width
    return { 
      width: containerWidth / routes.length 
    };
  };
  
  // Render the tab bar
  const renderTabBar = () => {
    const TabBarContainer = scrollable ? ScrollView : View;
    const tabContainerProps = scrollable ? { 
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      contentContainerStyle: styles.scrollableTabBarContent,
    } : {
      style: styles.fixedTabBar
    };
    
    return (
      <View 
        style={[
          styles.tabBarContainer, 
          { backgroundColor: theme.colors.surface },
          tabBarStyle
        ]}
      >
        <TabBarContainer {...tabContainerProps}>
          {routes.map((route, index) => {
            const isSelected = index === selectedIndex;
            
            return (
              <TouchableOpacity
                key={route.key}
                style={[
                  styles.tab,
                  getTabWidth(),
                  isSelected && { 
                    borderBottomWidth: 2, 
                    borderBottomColor: theme.colors.primary 
                  }
                ]}
                onPress={() => onIndexChange(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                {route.icon && (
                  <Icon
                    name={route.icon as any}
                    size="inline"
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    style={styles.tabIcon}
                  />
                )}
                <Text
                  style={[
                    theme.typography.tabLabel,
                    { 
                      color: isSelected 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary
                    }
                  ]}
                  numberOfLines={1}
                >
                  {route.title.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </TabBarContainer>
      </View>
    );
  };
  
  // Handle layout to determine container width
  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };
  
  return (
    <View 
      style={[styles.container, style]} 
      onLayout={onLayout}
    >
      {renderTabBar()}
      <View style={[styles.contentContainer, contentContainerStyle]}>
        {renderScene(routes[selectedIndex], selectedIndex)}
      </View>
    </View>
  );
};

/**
 * Component for rendering an empty tab state
 */
export const EmptyTabState: React.FC<{
  message: string;
  icon?: string;
}> = ({ message, icon }) => {
  const theme = useEdenTheme();
  
  return (
    <View style={styles.emptyContainer}>
      {icon && (
        <Icon 
          name={icon as any} 
          size="hero" 
          color={theme.colors.textSecondary}
          style={styles.emptyIcon}
        />
      )}
      <BodyText color={theme.colors.textSecondary} center>
        {message}
      </BodyText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EC', // Eden background color
  },
  tabBarContainer: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0DC', // Eden border color
  },
  fixedTabBar: {
    flexDirection: 'row',
    height: '100%',
  },
  scrollableTabBarContent: {
    height: 48,
  },
  tab: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabIcon: {
    marginRight: 4,
  },
  contentContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
}); 