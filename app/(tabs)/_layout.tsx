import { Tabs } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { Home, List, PlusCircle, Trophy, User } from 'lucide-react-native';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  const theme = useEdenTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: Platform.OS === 'ios' ? 85 : 60,
            paddingTop: 5,
            paddingBottom: Platform.OS === 'ios' ? 30 : 5,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontFamily: 'SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 10,
            fontWeight: '500',
            paddingBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          headerTitleStyle: {
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.text,
          },
        }}
        initialRouteName="lists">
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <Home size={24} color={color} strokeWidth={focused ? 2.5 : 1.5} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Your Courses',
          tabBarIcon: ({ color, focused }) => <List size={24} color={color} strokeWidth={focused ? 2.5 : 1.5} />,
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerTintColor: theme.colors.text,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => <PlusCircle size={28} color={color} strokeWidth={focused ? 2.5 : 1.5} />,
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => <Trophy size={24} color={color} strokeWidth={focused ? 2.5 : 1.5} />,
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <User size={24} color={color} strokeWidth={focused ? 2.5 : 1.5} />,
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          headerTintColor: theme.colors.text,
        }}
      />
    </Tabs>
    </View>
  );
}