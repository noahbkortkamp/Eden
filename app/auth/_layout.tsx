import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import ThemedLoadingScreen from '../components/ThemedLoadingScreen';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // If user is already logged in, redirect to the lists tab
  if (!loading && user) {
    return <Redirect href="/(tabs)/lists" />;
  }

  // Show loading indicator while checking auth status
  if (loading) {
    return <ThemedLoadingScreen message="Checking authentication" />;
  }

  // If not logged in, show the auth stack
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' } 
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Log In',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Sign Up',
        }}
      />
    </Stack>
  );
} 