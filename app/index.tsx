import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from './context/AuthContext';
import { useAppNavigation } from './hooks/useAppNavigation';

export default function Index() {
  console.log('🔍 Index: Component mounting...');
  
  // Always call hooks in the same order - this prevents hooks violations
  const { user, loading } = useAuth();
  const navigation = useAppNavigation({ user, loading });

  console.log('🔍 Index: Current state - user:', user ? `ID: ${user.id}` : 'null', 'loading:', loading);

  // Show loading spinner while determining navigation
  if (navigation.shouldShowLoading) {
    const loadingText = loading ? 'Loading app...' : 'Checking your progress...';
    console.log(`🔍 Index: Showing loading spinner - ${loadingText}`);
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>{loadingText}</Text>
        {navigation.error && (
          <Text style={{ marginTop: 8, color: '#ef4444', fontSize: 12 }}>
            {navigation.error}
          </Text>
        )}
      </View>
    );
  }

  // Return null while navigation is happening - the hooks handle the actual navigation
  return null;
} 