import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider } from './context/AuthContext';
import { ReviewProvider } from './review/context/ReviewContext';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { initializeAuthDeepLinks } from './services/auth';
import './i18n';

declare global {
  interface Window {
    frameworkReady?: () => void | Promise<void>;
  }
}

function AppContent() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/login"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Log In',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
          }}
        />
        <Stack.Screen
          name="auth/signup"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Sign Up',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
          }}
        />
        <Stack.Screen
          name="(modals)/review"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Review Course',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
          }}
        />
        <Stack.Screen
          name="(modals)/comparison"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Compare Courses',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
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
        if (Platform.OS === 'web' && window.frameworkReady) {
          await window.frameworkReady();
        }
        // Initialize deep linking for auth
        initializeAuthDeepLinks();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setIsLoading(false);
      }
    };

    initializeFramework();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SearchProvider>
            <ReviewProvider>
              <AppContent />
            </ReviewProvider>
          </SearchProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
