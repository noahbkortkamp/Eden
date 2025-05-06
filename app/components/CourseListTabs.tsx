import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme } from '../theme/ThemeProvider';
import { PlayedCoursesList } from './PlayedCoursesList';
import { WantToPlayCoursesList } from './WantToPlayCoursesList';
import { Course } from '../types/review';
import { usePlayedCourses } from '../context/PlayedCoursesContext';

// Specialized components for each tab
const RecommendedList = ({ courses, onCoursePress, reviewCount }: { courses: Course[], onCoursePress: (course: Course) => void, reviewCount?: number }) => {
  const theme = useTheme();
  // Return empty state since this functionality isn't built yet
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' }}>
        Coming soon
      </Text>
    </View>
  );
};

interface CourseListTabsProps {
  playedCourses: Course[];
  wantToPlayCourses: Course[];
  recommendedCourses: Course[];
  onCoursePress?: (course: Course) => void;
  reviewCount?: number;
  courseType?: 'played' | 'recommended' | 'want-to-play';
  setCourseType?: (courseType: 'played' | 'recommended' | 'want-to-play') => void;
  showScores?: boolean;
  isLoading?: boolean;
  refreshKey?: number;
  handleCoursePress?: (course: Course) => void;
  renderWantToPlayScene?: () => React.ReactNode;
}

// Export as memoized component to prevent unnecessary re-renders
export const CourseListTabs: React.FC<CourseListTabsProps> = React.memo(({
  playedCourses,
  wantToPlayCourses,
  recommendedCourses,
  onCoursePress,
  reviewCount = 0,
  courseType,
  setCourseType,
  showScores,
  isLoading,
  refreshKey,
  handleCoursePress,
  renderWantToPlayScene,
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
    setTimeout(() => {
      console.log('📌 CourseListTabs Mounted');
    }, 0);
    
    return () => {
      setTimeout(() => {
        console.log('📌 CourseListTabs Unmounted');
      }, 0);
    };
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

  const [index, setIndex] = useState(() => {
    switch (courseType) {
      case 'played': return 0;
      case 'want-to-play': return 1;
      case 'recommended': return 2;
      default: return 0;
    }
  });

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
    
    // Debug log for Want to Play data
    if (route.key === 'wantToPlay') {
      console.log('🔍 DIAGNOSTIC - Want to Play Data Flow:', {
        routeKey: route.key,
        fromProps: wantToPlayCourses?.length || 0,
        fromInternalState: internalWantToPlayCourses?.length || 0,
        fromGlobalContext: globalWantToPlayCourses?.length || 0,
        finalCount: coursesToRender.wantToPlay?.length || 0,
        hasCustomRenderer: !!renderWantToPlayScene
      });
      
      // Check first course if available
      if (coursesToRender.wantToPlay?.length > 0) {
        const firstCourse = coursesToRender.wantToPlay[0];
        console.log('🔍 First Want to Play course:', {
          id: firstCourse.id,
          name: firstCourse.name,
          location: firstCourse.location
        });
      }
    }
    
    // Safely determine the course press handler
    const coursePressHandler = (course: Course) => {
      if (onCoursePress) {
        onCoursePress(course);
      } else if (handleCoursePress) {
        handleCoursePress(course);
      } else {
        console.log('No course press handler provided for', course.name);
      }
    };
    
    switch (route.key) {
      case 'played':
        return <PlayedCoursesList 
                 key={`played-${remountKey}`} 
                 courses={coursesToRender.played || []} 
                 onCoursePress={coursePressHandler} 
                 reviewCount={reviewCount}
               />;
      case 'wantToPlay':
        // Use renderWantToPlayScene prop if provided - DIRECT RETURN
        if (renderWantToPlayScene) {
          console.log('→ DIRECT RENDERING: Want to Play tab with custom component');
          // Return with absolutely no wrapping to avoid any layout issues
          return renderWantToPlayScene();
        }
        
        // Fall back to direct rendering only if no external renderer is provided
        console.log('🔄 Rendering fallback WantToPlayCoursesList with', coursesToRender.wantToPlay?.length || 0, 'courses');
        return <WantToPlayCoursesList 
                 key={`wantToPlay-${remountKey}`} 
                 courses={coursesToRender.wantToPlay || []} 
                 onCoursePress={coursePressHandler}
                 reviewCount={reviewCount}
               />;
      case 'recommended':
        return <RecommendedList 
                 key={`recommended-${remountKey}`} 
                 courses={coursesToRender.recommended || []} 
                 onCoursePress={coursePressHandler}
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
    handleCoursePress,
    remountKey,
    reviewCount,
    renderWantToPlayScene
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

  // Update internal state only when props change
  useEffect(() => {
    if (isMounted.current) {
      setInternalPlayedCourses(playedCourses);
      setInternalWantToPlayCourses(wantToPlayCourses);
      setInternalRecommendedCourses(recommendedCourses);
    }
  }, [playedCourses, wantToPlayCourses, recommendedCourses]);

  // Update index when courseType changes
  useEffect(() => {
    let newIndex;
    switch (courseType) {
      case 'played': newIndex = 0; break;
      case 'want-to-play': newIndex = 1; break;
      case 'recommended': newIndex = 2; break;
      default: newIndex = 0;
    }
    setIndex(newIndex);
    console.log('Tab index updated to:', newIndex, 'for courseType:', courseType);
  }, [courseType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return !isReady ? null : (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {/* SafeAreaView for proper iOS spacing - now without a duplicate header */}
      <SafeAreaView style={{ 
        backgroundColor: theme.colors.surface,
        paddingBottom: 0 // Remove bottom padding as the tabs will be right below
      }} />
      
      {/* Custom tab bar using simple buttons */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        elevation: 3,
      }}>
        {routes.map((route, i) => (
          <TouchableOpacity
            key={route.key}
            style={{
              flex: 1,
              paddingVertical: 14,
              backgroundColor: i === index ? 'rgba(0,0,0,0.05)' : 'transparent',
              alignItems: 'center',
              borderBottomWidth: i === index ? 3 : 0,
              borderBottomColor: theme.colors.primary,
            }}
            onPress={() => {
              setIndex(i);
              // Update courseType when tab is pressed
              switch (i) {
                case 0: setCourseType?.('played'); break;
                case 1: setCourseType?.('want-to-play'); break;
                case 2: setCourseType?.('recommended'); break;
              }
            }}
          >
            <Text 
              style={{
                color: i === index ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: '500',
              }}
            >
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Simple direct content rendering based on index */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {index === 0 && renderScene({ route: { key: 'played' } })}
        
        {index === 1 && (
          <View style={{ flex: 1 }}>
            {renderScene({ route: { key: 'wantToPlay' } })}
          </View>
        )}
        
        {index === 2 && renderScene({ route: { key: 'recommended' } })}
      </View>
    </View>
  );
}); 