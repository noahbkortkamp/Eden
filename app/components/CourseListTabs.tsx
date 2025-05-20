import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useEdenTheme } from '../theme/ThemeProvider';
import { PlayedCoursesList } from './PlayedCoursesList';
import { WantToPlayCoursesList } from './WantToPlayCoursesList';
import { Course } from '../types/review';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { SmallText } from './eden/Typography';

// Specialized components for each tab
const RecommendedList = ({ courses, onCoursePress, reviewCount }: { courses: Course[], onCoursePress: (course: Course) => void, reviewCount?: number }) => {
  const theme = useEdenTheme();
  // Return empty state since this functionality isn't built yet
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <SmallText color={theme.colors.textSecondary} style={{ textAlign: 'center' }}>
        Coming soon
      </SmallText>
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
  const theme = useEdenTheme();
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
        <SmallText color={theme.colors.textSecondary}>Loading...</SmallText>
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
    
    // Pass along the course press handler or use the one from props
    const coursePressHandler = handleCoursePress || onCoursePress;
    
    // Return the appropriate component based on the route
    switch (route.key) {
      case 'played':
        return (
          <PlayedCoursesList 
            courses={coursesToRender.played || []} 
            handleCoursePress={coursePressHandler}
            showScores={showScores}
          />
        );
      case 'wantToPlay':
        // Use custom render function if provided
        if (renderWantToPlayScene) {
          return renderWantToPlayScene();
        }
        return (
          <WantToPlayCoursesList 
            courses={coursesToRender.wantToPlay || []} 
            handleCoursePress={(course: Course) => {
              if (coursePressHandler) {
                coursePressHandler(course);
              }
            }}
            showScores={showScores}
          />
        );
      case 'recommended':
        return (
          <RecommendedList 
            courses={coursesToRender.recommended || []} 
            onCoursePress={(course: Course) => {
              if (coursePressHandler) {
                coursePressHandler(course);
              }
            }}
            reviewCount={reviewCount}
          />
        );
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
    showScores,
    reviewCount,
    renderWantToPlayScene
  ]);

  // Handle index change and update courseType if provided
  const handleIndexChange = useCallback((newIndex: number) => {
    setIndex(newIndex);
    
    // Update courseType if setCourseType is provided
    if (setCourseType) {
      switch (newIndex) {
        case 0:
          setCourseType('played');
          break;
        case 1:
          setCourseType('want-to-play');
          break;
        case 2:
          setCourseType('recommended');
          break;
      }
    }
  }, [setCourseType]);

  // Render TabBar with Eden design system styling
  const renderTabBar = useCallback((props: any) => (
    <TabBar
      {...props}
      style={{
        backgroundColor: theme.colors.background,
        shadowOffset: { height: 0, width: 0 },
        shadowOpacity: 0,
        elevation: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
      renderLabel={({ route, focused }: { route: { title: string }; focused: boolean }) => (
        <Text
          style={{
            color: focused ? theme.colors.primary : theme.colors.textSecondary,
            fontFamily: theme.typography.tabLabel.fontFamily,
            fontSize: theme.typography.tabLabel.fontSize,
            fontWeight: focused ? '600' : '400',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            textAlign: 'center',
            marginHorizontal: theme.spacing.xs,
          }}
        >
          {route.title}
        </Text>
      )}
      indicatorStyle={{
        backgroundColor: theme.colors.primary,
        height: 3,
      }}
      tabStyle={{
        height: 48,
        padding: 0,
      }}
      pressColor={theme.colors.primary + '20'} // Add transparency to ripple color
    />
  ), [theme]);

  // Don't render the TabView before layout is measured
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TabView
        key={`${stableKey}-${refreshKey || remountKey}`}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={handleIndexChange}
        initialLayout={{ width: layout.width }}
        lazy
        lazyPreloadDistance={1}
        renderLazyPlaceholder={renderLazyPlaceholder}
        swipeEnabled={Platform.OS !== 'web'} // Disable swiping on web
      />
    </SafeAreaView>
  );
}); 