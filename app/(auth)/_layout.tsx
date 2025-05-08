import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();

  // If not authenticated, redirect to login
  if (!user) {
    return <Stack redirect="/auth/login" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="first-review"
        options={{
          title: 'First Review',
          headerShown: false,
          gestureEnabled: false, // Prevent back gesture
        }}
      />
    </Stack>
  );
} 