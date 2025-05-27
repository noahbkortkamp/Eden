import { Stack, Slot } from 'expo-router';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { edenTheme } from '../theme/edenTheme';
import { useColorScheme } from 'react-native';
import { useTheme } from '@/app/theme';

export default function AuthLayout() {
  const { user } = useAuth();
  const theme = useTheme();
  const colorScheme = useColorScheme();

  // Note: No redirect here to allow showing the welcome screen to unauthenticated users

  return (
    <Stack
      screenOptions={{
      headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding-signup" options={{ headerShown: false }} />
      <Stack.Screen
        name="first-review"
        options={{
          title: 'First Review',
          gestureEnabled: false, // Prevent back gesture
        }}
      />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
} 