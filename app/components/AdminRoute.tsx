import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAdminGroup = segments[0] === '(admin)';

    if (!user) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
    } else if (!isAdmin && inAdminGroup) {
      // Redirect to home if not admin and trying to access admin routes
      router.replace('/(tabs)');
    }
  }, [user, loading, isAdmin, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
} 