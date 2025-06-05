import { Redirect } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  console.log('🔍 Index: Component mounting...');
  const { user, loading } = useAuth();
  const [navigationReady, setNavigationReady] = useState(false);

  console.log('🔍 Index: Current state - user:', user ? `ID: ${user.id}` : 'null', 'loading:', loading);

  // Simple navigation readiness check
  useEffect(() => {
    if (!loading) {
      console.log('🔍 Index: Auth loading complete, setting navigation ready');
      // Small delay to ensure auth state is fully settled
      setTimeout(() => {
        setNavigationReady(true);
      }, 100);
    }
  }, [loading]);

  console.log('🔍 Index: Rendering with loading:', loading, 'navigationReady:', navigationReady);

  // Show loading spinner while checking auth or navigation not ready
  if (loading || !navigationReady) {
    console.log('🔍 Index: Showing loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading app...</Text>
      </View>
    );
  }

  console.log('🔍 Index: Navigation ready, determining redirect');
  
  // If we have a user, check their onboarding status
  if (user) {
    console.log('🔍 Index: User present, checking onboarding status');
    console.log('🔍 Index: User metadata:', user.user_metadata);
    
    if (user.user_metadata?.onboardingComplete === false) {
      console.log('🔍 Index: Redirecting to onboarding');
      return <Redirect href="/onboarding/profile-info" />;
    } else {
      console.log('🔍 Index: Redirecting to main app');
      return <Redirect href="/(tabs)/lists" />;
    }
  }

  // No user - redirect to auth
  console.log('🔍 Index: No user, redirecting to auth');
  return <Redirect href="/auth/login" />;
} 