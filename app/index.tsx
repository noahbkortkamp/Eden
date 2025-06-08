import { Redirect } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  console.log('🔍 Index: Component mounting...');
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log('🔍 Index: Current state - user:', user ? `ID: ${user.id}` : 'null', 'loading:', loading);

  // Show loading spinner while auth is checking
  if (loading) {
    console.log('🔍 Index: Showing loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading app...</Text>
      </View>
    );
  }

  // Check if profile is complete
  const profileComplete = user?.user_metadata?.onboardingComplete !== false;

  // Single clear redirect block
  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
    } else if (!profileComplete) {
      router.replace('/onboarding/profile-info');
    } else {
      router.replace('/(tabs)/lists');
    }
  }, [user, profileComplete]);

  // Return null while navigation is happening
  return null;
} 