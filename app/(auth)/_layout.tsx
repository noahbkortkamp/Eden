import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { edenTheme } from '../theme/edenTheme';

export default function AuthLayout() {
  const { user } = useAuth();

  // If not authenticated, redirect to login
  if (!user) {
    return <Stack redirect="/auth/login" />;
  }

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: edenTheme.colors.background },
      animation: 'none',
      headerBackVisible: false,
      presentation: 'modal'
    }}>
      <Stack.Screen
        name="first-review"
        options={{
          title: 'First Review',
          gestureEnabled: false, // Prevent back gesture
        }}
      />
    </Stack>
  );
} 