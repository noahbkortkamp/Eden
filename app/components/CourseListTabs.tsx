import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme } from '../theme/ThemeProvider';
import { PlayedCoursesList } from './PlayedCoursesList';
import { Course } from '../types/review';

// Specialized components for each tab
const WantToPlayList = ({ courses, onCoursePress }: { courses: Course[], onCoursePress: (course: Course) => void }) => {
  return <PlayedCoursesList courses={courses} onCoursePress={onCoursePress} />;
};

const RecommendedList = ({ courses, onCoursePress }: { courses: Course[], onCoursePress: (course: Course) => void }) => {
  return <PlayedCoursesList courses={courses} onCoursePress={onCoursePress} />;
};

interface CourseListTabsProps {
  playedCourses: Course[];
  wantToPlayCourses: Course[];
  recommendedCourses: Course[];
  onCoursePress: (course: Course) => void;
}

export const CourseListTabs: React.FC<CourseListTabsProps> = ({
  playedCourses,
  wantToPlayCourses,
  recommendedCourses,
  onCoursePress,
}) => {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'played', title: 'Played' },
    { key: 'wantToPlay', title: 'Want to Play' },
    { key: 'recommended', title: 'Recommended' },
  ]);
  
  // Use a ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Calculate screen dimensions, accounting for safe areas
  const [layout, setLayout] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });
  
  // Add ready state to delay TabView initialization
  const [isReady, setIsReady] = useState(false);
  
  // Force remount key - to help with rerendering after navigation
  const [remountKey, setRemountKey] = useState(Date.now());
  
  // Initialize component with a slight delay to ensure proper layout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setIsReady(true);
      }
    }, 50); // Small delay to ensure component has rendered
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // Update layout when dimensions change
  useEffect(() => {
    const updateLayout = () => {
      if (isMounted.current) {
        setLayout({
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        });
        // Force tab view to remount with new dimensions
        setRemountKey(Date.now());
      }
    };
    
    const subscription = Dimensions.addEventListener('change', updateLayout);
    
    // Initial layout update
    updateLayout();
    
    return () => {
      isMounted.current = false;
      subscription?.remove();
    };
  }, []);
  
  useEffect(() => {
    // When props change (like when courses update), force a remount
    setRemountKey(Date.now());
  }, [playedCourses, wantToPlayCourses, recommendedCourses]);

  // Create renderScene function that creates new instances for each tab
  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'played':
        return <PlayedCoursesList 
                 key={`played-${remountKey}`} 
                 courses={playedCourses} 
                 onCoursePress={onCoursePress} 
               />;
      case 'wantToPlay':
        return <WantToPlayList 
                 key={`wantToPlay-${remountKey}`} 
                 courses={wantToPlayCourses} 
                 onCoursePress={onCoursePress} 
               />;
      case 'recommended':
        return <RecommendedList 
                 key={`recommended-${remountKey}`} 
                 courses={recommendedCourses} 
                 onCoursePress={onCoursePress} 
               />;
      default:
        return null;
    }
  };

  const renderTabBar = (props: any) => (
    <View style={styles.tabBarContainer}>
      <TabBar
        {...props}
        indicatorStyle={{ 
          backgroundColor: theme.colors.primary,
          height: 3,
        }}
        style={[
          styles.tabBar,
          { 
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }
        ]}
        labelStyle={{ 
          ...theme.typography.body,
          textTransform: 'none',
          fontWeight: '500',
          margin: 0,
          padding: 0,
        }}
        tabStyle={{
          paddingVertical: 14, // Slightly taller tabs for better touch targets
        }}
        activeColor={theme.colors.primary}
        inactiveColor={theme.colors.textSecondary}
        pressColor={theme.colors.background} // Ripple color on Android
        pressOpacity={0.7} // Press opacity on iOS
      />
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      overflow: 'hidden', // Prevent content from overflowing
    },
    tabView: {
      flex: 1,
    },
    tabBarContainer: {
      // Using shadow for iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      // Using elevation for Android
      elevation: 3,
      zIndex: 2, // Ensure tab bar stays on top
      backgroundColor: theme.colors.surface,
    },
    tabBar: {
      elevation: 0, // Remove default elevation to apply our custom one
      shadowOpacity: 0, // Remove default shadow
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });

  // Handle layout changes
  const onLayout = () => {
    setLayout({
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    });
    
    // Ensure the component is ready after layout
    if (!isReady && isMounted.current) {
      setIsReady(true);
    }
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {isReady ? (
        <TabView
          key={`tabview-${remountKey}`}
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          style={styles.tabView}
          swipeEnabled={true}
          lazy={true}
          lazyPreloadDistance={1} // Preload adjacent tabs
        />
      ) : (
        <View style={styles.loadingContainer} />
      )}
    </View>
  );
}; 