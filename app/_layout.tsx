// Import core modules and providers
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReviewProvider } from './review/context/ReviewContext';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { initializeAuthDeepLinks } from './services/auth';
import * as WebBrowser from 'expo-web-browser';
import './i18n';
import { PlayedCoursesProvider } from './context/PlayedCoursesContext';
import { CourseProvider } from './context/CourseContext';
import LoadingScreen from './components/LoadingScreen';

declare global {
  interface Window {
    frameworkReady?: () => void | Promise<void>;
  }
}

// Separate AppContent component that waits for auth to be ready
function AppContent() {
  const theme = useTheme();
  const { loading: authLoading } = useAuth();
  
  // Show loading screen while auth is still checking
  if (authLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ flex: 1 }}>
        <Stack 
          initialRouteName="index"
          screenOptions={{ 
            headerShown: false,
            headerBackVisible: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'fade',
            presentation: 'transparentModal'
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)"
            options={{
              presentation: 'modal',
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              animation: 'none',
              presentation: 'transparentModal'
            }}
          />
          <Stack.Screen
            name="(auth)"
            options={{
              headerShown: false,
              animation: 'none',
              presentation: 'transparentModal'
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              presentation: 'modal',
              headerShown: false,
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
              headerShown: false,
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
              headerShown: false,
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
              headerShown: false,
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
    </View>
  );
}

function ErrorScreen({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
          {t('errors.failedToInitialize')}
        </Text>
      </View>
      <View>
        <Text style={{ color: '#64748b', textAlign: 'center' }}>{error.message}</Text>
      </View>
    </View>
  );
}

// Root layout component
export default function RootLayout() {
  const [isFrameworkLoading, setIsFrameworkLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeFramework = async () => {
      try {
        console.log('🔄 Starting framework initialization...');
        
        if (Platform.OS === 'web' && window.frameworkReady) {
          await window.frameworkReady();
        }
        
        // Make sure WebBrowser can handle auth sessions
        WebBrowser.maybeCompleteAuthSession();
        
        // Initialize deep linking for auth with better error handling
        try {
          initializeAuthDeepLinks();
          console.log('✅ Deep linking initialized successfully');
        } catch (deepLinkError) {
          console.error('❌ Failed to initialize deep linking:', deepLinkError);
        }
        
        // TEMPORARY: Add delay to see loading screen in development
        // Remove this before production build
        if (__DEV__) {
          console.log('🔄 Showing loading screen for 2 seconds (dev mode only)');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ Framework initialization complete');
        setIsFrameworkLoading(false);
      } catch (err) {
        console.error('❌ Framework initialization failed:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setIsFrameworkLoading(false);
      }
    };

    initializeFramework();
  }, []);

  // Show loading screen during framework initialization
  if (isFrameworkLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Once framework is ready, initialize providers and let AuthProvider handle its own loading
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SearchProvider>
            <PlayedCoursesProvider>
              <CourseProvider>
                <ReviewProvider>
                  <AppContent />
                </ReviewProvider>
              </CourseProvider>
            </PlayedCoursesProvider>
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
