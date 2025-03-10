import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme } from '../theme/ThemeProvider';
import { PlayedCoursesList } from './PlayedCoursesList';
import { Course } from '../types/review';

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

  const renderScene = SceneMap({
    played: () => <PlayedCoursesList courses={playedCourses} onCoursePress={onCoursePress} />,
    wantToPlay: () => <PlayedCoursesList courses={wantToPlayCourses} onCoursePress={onCoursePress} />,
    recommended: () => <PlayedCoursesList courses={recommendedCourses} onCoursePress={onCoursePress} />,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: theme.colors.primary }}
      style={{ backgroundColor: theme.colors.surface }}
      labelStyle={{ ...theme.typography.body }}
      activeColor={theme.colors.primary}
      inactiveColor={theme.colors.textSecondary}
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={setIndex}
      initialLayout={{ width: Dimensions.get('window').width }}
    />
  );
}; 