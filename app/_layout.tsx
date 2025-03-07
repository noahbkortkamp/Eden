import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider } from './context/auth';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import './i18n';

declare global {
  interface Window {
    frameworkReady?: () => void | Promise<void>;
  }
}

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 16, color: '#64748b' }}>{t('loading.initializing')}</Text>
    </View>
  );
}

function ErrorScreen({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
        {t('errors.failedToInitialize')}
      </Text>
      <Text style={{ color: '#64748b', textAlign: 'center' }}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeFramework = async () => {
      try {
        // Only check for frameworkReady on web platform
        if (Platform.OS === 'web' && window.frameworkReady) {
          await window.frameworkReady();
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize framework'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeFramework();
  }, []);

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SearchProvider>
          <View style={styles.container}>
            <View style={styles.header}>
              <LanguageSwitcher />
            </View>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </View>
        </SearchProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
});
