import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReviewScreen } from '../screens/ReviewScreen';
import { CourseComparisonScreen } from '../screens/CourseComparisonScreen';
import { Course } from '../../types/review';

export type ReviewStackParamList = {
  Review: {
    course: Course;
  };
  CourseComparison: {
    courseA: Course;
    courseB: Course;
    remainingComparisons: number;
  };
};

const Stack = createNativeStackNavigator<ReviewStackParamList>();

export const ReviewNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#fff',
        },
      }}
    >
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={({ route }) => ({
          title: 'Review Course',
        })}
      />
      <Stack.Screen
        name="CourseComparison"
        component={CourseComparisonScreen}
        options={{
          title: 'Compare Courses',
          headerLeft: () => null, // Disable back button
          gestureEnabled: false, // Disable swipe back
        }}
      />
    </Stack.Navigator>
  );
}; 