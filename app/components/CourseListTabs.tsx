import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme } from '../theme/ThemeProvider';
import { PlayedCoursesList } from './PlayedCoursesList';
import { Course } from '../types/review';
import { usePlayedCourses } from '../context/PlayedCoursesContext';

// Specialized components for each tab
const WantToPlayList = ({ courses, onCoursePress, reviewCount }: { courses: Course[], onCoursePress: (course: Course) => void, reviewCount?: number }) => {
  return <PlayedCoursesList courses={courses} onCoursePress={onCoursePress} reviewCount={reviewCount} />;
};

const RecommendedList = ({ courses, onCoursePress, reviewCount }: { courses: Course[], onCoursePress: (course: Course) => void, reviewCount?: number }) => {
  return <PlayedCoursesList courses={courses} onCoursePress={onCoursePress} reviewCount={reviewCount} />;
};

interface CourseListTabsProps {
  playedCourses: Course[];
  wantToPlayCourses: Course[];
  recommendedCourses: Course[];
  onCoursePress: (course: Course) => void;
  reviewCount?: number;
}

// Export as memoized component to prevent unnecessary re-renders
export const CourseListTabs: React.FC<CourseListTabsProps> = React.memo(({
  playedCourses,
  wantToPlayCourses,
  recommendedCourses,
  onCoursePress,
  reviewCount = 0,
}) => {
  const theme = useTheme();
  // Access global course state from context
  const { 
    playedCourses: globalPlayedCourses,
    wantToPlayCourses: globalWantToPlayCourses,
    recommendedCourses: globalRecommendedCourses
  } = usePlayedCourses();
  
  // Add internal state to persist course data
  const [internalPlayedCourses, setInternalPlayedCourses] = useState<Course[]>([]);
  const [internalWantToPlayCourses, setInternalWantToPlayCourses] = useState<Course[]>([]);
  const [internalRecommendedCourses, setInternalRecommendedCourses] = useState<Course[]>([]);
  
  // Add lifecycle logging
  useEffect(() => {
    console.log('📌 CourseListTabs Mounted');
    return () => console.log('📌 CourseListTabs Unmounted');
  }, []);
  
  // Update internal state when props change, but ONLY if the new data is not empty
  useEffect(() => {
    console.log('🔎 DIAGNOSTIC: CourseListTabs checking received data:', {
      playedCount: playedCourses?.length || 0,
      wantToPlayCount: wantToPlayCourses?.length || 0,
      recommendedCount: recommendedCourses?.length || 0,
    });
    
    // Only update internal state if new data is not empty
    if (playedCourses && playedCourses.length > 0) {
      console.log('🔎 DIAGNOSTIC: Updating internal played courses state with', playedCourses.length, 'courses');
      setInternalPlayedCourses(playedCourses);
    } else if (globalPlayedCourses && globalPlayedCourses.length > 0) {
      console.log('🔎 DIAGNOSTIC: Using global played courses with', globalPlayedCourses.length, 'courses');
      setInternalPlayedCourses(globalPlayedCourses);
    } else {
      console.log('🔎 DIAGNOSTIC: Skipping empty played courses update to preserve existing data');
    }
    
    if (wantToPlayCourses && wantToPlayCourses.length > 0) {
      setInternalWantToPlayCourses(wantToPlayCourses);
    } else if (globalWantToPlayCourses && globalWantToPlayCourses.length > 0) {
      setInternalWantToPlayCourses(globalWantToPlayCourses);
    }
    
    if (recommendedCourses && recommendedCourses.length > 0) {
      setInternalRecommendedCourses(recommendedCourses);
    } else if (globalRecommendedCourses && globalRecommendedCourses.length > 0) {
      setInternalRecommendedCourses(globalRecommendedCourses);
    }
  }, [playedCourses, wantToPlayCourses, recommendedCourses, globalPlayedCourses, globalWantToPlayCourses, globalRecommendedCourses]);
  
  // Debug log when internal state changes
  useEffect(() => {
    console.log('🔎 DIAGNOSTIC: CourseListTabs internal state updated:', {
      internalPlayedCount: internalPlayedCourses?.length || 0,
      internalWantToPlayCount: internalWantToPlayCourses?.length || 0,
      internalRecommendedCount: internalRecommendedCourses?.length || 0,
    });
  }, [internalPlayedCourses, internalWantToPlayCourses, internalRecommendedCourses]);

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
  
  // Add a stable key that doesn't change on every render
  const stableKey = useRef(`tabs-${Date.now()}`).current;
  
  // Force remount key - to help with rerendering after navigation when absolutely necessary
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
  
  // Optimize renderLazyPlaceholder for better UX during lazy loading
  const renderLazyPlaceholder = useCallback(() => {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background 
      }}>
        <Text style={{ color: theme.colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }, [theme]);
  
  // Replace the effect that sets remountKey with a more selective approach
  useEffect(() => {
    // Only update the remount key if there's an actual change in data length
    // This prevents unnecessary remounts when the same data is passed in
    const shouldRemount = 
      (playedCourses?.length !== internalPlayedCourses.length) ||
      (wantToPlayCourses?.length !== internalWantToPlayCourses.length) ||
      (recommendedCourses?.length !== internalRecommendedCourses.length);
      
    if (shouldRemount) {
      // Limit console logging to reduce performance impact
      setRemountKey(Date.now());
    }
  }, [
    playedCourses?.length, 
    wantToPlayCourses?.length, 
    recommendedCourses?.length,
    internalPlayedCourses.length,
    internalWantToPlayCourses.length,
    internalRecommendedCourses.length
  ]);

  // Create a simpler custom renderScene that ensures content is rendered immediately
  const renderScene = useCallback(({ route }: { route: { key: string } }) => {    
    // Priority: Props > Internal State > Global Context
    const coursesToRender = {
      played: (playedCourses && playedCourses.length > 0) 
        ? playedCourses 
        : (internalPlayedCourses && internalPlayedCourses.length > 0)
          ? internalPlayedCourses
          : globalPlayedCourses,
          
      wantToPlay: (wantToPlayCourses && wantToPlayCourses.length > 0)
        ? wantToPlayCourses
        : (internalWantToPlayCourses && internalWantToPlayCourses.length > 0)
          ? internalWantToPlayCourses
          : globalWantToPlayCourses,
          
      recommended: (recommendedCourses && recommendedCourses.length > 0)
        ? recommendedCourses
        : (internalRecommendedCourses && internalRecommendedCourses.length > 0)
          ? internalRecommendedCourses
          : globalRecommendedCourses,
    };
    
    switch (route.key) {
      case 'played':
        return <PlayedCoursesList 
                 key={`played-${remountKey}`} 
                 courses={coursesToRender.played || []} 
                 onCoursePress={onCoursePress} 
                 reviewCount={reviewCount}
               />;
      case 'wantToPlay':
        return <WantToPlayList 
                 key={`wantToPlay-${remountKey}`} 
                 courses={coursesToRender.wantToPlay || []} 
                 onCoursePress={onCoursePress} 
                 reviewCount={reviewCount}
               />;
      case 'recommended':
        return <RecommendedList 
                 key={`recommended-${remountKey}`} 
                 courses={coursesToRender.recommended || []} 
                 onCoursePress={onCoursePress} 
                 reviewCount={reviewCount}
               />;
      default:
          return null;
    }
  }, [
    playedCourses,
    wantToPlayCourses,
    recommendedCourses,
    internalPlayedCourses,
    internalWantToPlayCourses,
    internalRecommendedCourses,
    globalPlayedCourses,
    globalWantToPlayCourses,
    globalRecommendedCourses,
    onCoursePress,
    remountKey,
    reviewCount
  ]);

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

  return !isReady ? null : (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {/* Add diagnostic info */}
      {playedCourses?.length === 0 && (
        <View style={{ padding: 5, backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <Text style={{ fontSize: 12, color: 'red' }}>
            DIAGNOSTIC: No played courses to display. See logs for details.
          </Text>
        </View>
      )}
      
      <TabView
        key={stableKey}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={layout}
        renderTabBar={renderTabBar}
        lazy={false} // Disable lazy loading completely to ensure first tab shows immediately
        swipeEnabled={true}
        style={{
          backgroundColor: theme.colors.background,
        }}
      />
    </View>
  );
}); 