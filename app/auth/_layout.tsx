import { useEffect } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import ThemedLoadingScreen from '../components/ThemedLoadingScreen';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  
  // Get the current route within the auth stack
  const currentAuthRoute = segments[segments.length - 1];

  // If user is already logged in, redirect to the lists tab
  // EXCEPT for the first-review screen, which authenticated users should be able to access
  if (!loading && user && currentAuthRoute !== 'first-review') {
    return <Redirect href="/(tabs)/lists" />;
  }

  // Show loading indicator while checking auth status
  if (loading) {
    return <ThemedLoadingScreen message="Checking authentication" />;
  }

  // If not logged in, show the auth stack with all screens
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' } 
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          title: 'Welcome',
        }}
      />
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
      <Stack.Screen
        name="onboarding-signup"
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="first-review"
        options={{
          title: 'First Review',
        }}
      />
      <Stack.Screen
        name="callback"
        options={{
          title: 'Authenticating',
        }}
      />
      <Stack.Screen
        name="debug"
        options={{
          title: 'Auth Debug',
        }}
      />
    </Stack>
  );
} 