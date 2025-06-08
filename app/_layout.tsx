// Import core modules and providers
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReviewProvider } from './review/context/ReviewContext';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { initializeAuthDeepLinks } from './services/auth';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import './i18n';
import { PlayedCoursesProvider } from './context/PlayedCoursesContext';
import { CourseProvider } from './context/CourseContext';
import LoadingScreen from './components/LoadingScreen';
import { validateSupabaseConfig } from './utils/supabase';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

// Enhanced initialization logging with startup validation
console.log('💚 LAYOUT: _layout.tsx loading started:', { 
  platform: Platform.OS, 
  dev: __DEV__, 
  timestamp: new Date().toISOString(),
  hermes: !!(global as any).HermesInternal,
  nodeEnv: process.env.NODE_ENV
});

// Early environment validation
const startupEnvCheck = {
  supabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  hasApiUrl: !!process.env.EXPO_PUBLIC_API_URL // Should be false
};

console.log('💚 LAYOUT: Environment validation:', startupEnvCheck);

if (!startupEnvCheck.supabaseUrl || !startupEnvCheck.supabaseKey) {
  console.error('❌ LAYOUT: Critical environment variables missing');
  if (!__DEV__) {
    console.error('❌ PRODUCTION: App startup may fail due to missing Supabase credentials');
  }
} else {
  console.log('✅ LAYOUT: Environment validation passed');
}

if (startupEnvCheck.hasApiUrl) {
  console.warn('⚠️ LAYOUT: EXPO_PUBLIC_API_URL is still set - this was previously causing crashes');
}

// Warm up the browser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

// Separate AppContent component with error boundaries
function AppContent() {
  const theme = useTheme();
  
  console.log('🎨 AppContent rendering with theme:', theme.colors.background);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack 
        initialRouteName="index"
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="(modals)" 
          options={{ presentation: 'modal', headerShown: false }} 
        />
        <Stack.Screen 
          name="auth" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="onboarding" 
          options={{ headerShown: false }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}

function ErrorScreen({ error }: { error: Error }) {
  const { t } = useTranslation();
  
  // Show error in production for debugging
  useEffect(() => {
    console.error('🚨 ERROR SCREEN:', error.message, error.stack);
    if (!__DEV__) {
      // Alert in production for debugging
      setTimeout(() => {
        Alert.alert('App Error', `${error.message}\n\nPlease restart the app.`);
      }, 1000);
    }
  }, [error]);
  
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>
        {t('errors.generic', 'App Error')}
      </Text>
      <Text style={styles.errorMessage}>
        {error.message}
      </Text>
      <Text style={styles.errorDetails}>
        Please restart the app. If this persists, contact support.
      </Text>
    </View>
  );
}

// Safe fallback component if providers fail
function SafeFallback() {
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>Golf Course Review</Text>
      <Text style={styles.fallbackSubtext}>Starting app...</Text>
    </View>
  );
}

export default function RootLayout() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const initializeFramework = async () => {
      try {
        console.log('🔧 Starting app initialization...');
        
        // Simple validation without crashes
        validateSupabaseConfig();
        console.log('✅ Supabase config validated');
        
        // Initialize auth deep links
        await initializeAuthDeepLinks();
        console.log('✅ Auth deep links initialized');
        
        setInitialized(true);
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        setError(error as Error);
        setInitialized(true); // Still show the app, but with error state
      }
    };

    initializeFramework();
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (initialized) {
      console.log('🎬 Hiding splash screen...');
      SplashScreen.hideAsync()
        .then(() => console.log('✅ Splash screen hidden'))
        .catch(err => console.warn('⚠ Splash screen hide failed:', err.message));
    }
  }, [initialized]);

  // Show loading screen while initializing
  if (!initialized) {
    console.log('⏳ Showing loading screen...');
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (error) {
    console.log('🚨 Showing error screen:', error.message);
    return <ErrorScreen error={error} />;
  }

  console.log('🚀 Rendering main app with providers...');

  // Main app with all providers and safe fallbacks
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CourseProvider>
            <PlayedCoursesProvider>
              <SearchProvider>
                <ReviewProvider>
                  <AppContent />
                </ReviewProvider>
              </SearchProvider>
            </PlayedCoursesProvider>
          </CourseProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F5EC',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#234D2C',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 12,
    color: '#666',
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F5EC',
  },
  fallbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#234D2C',
    marginBottom: 8,
  },
  fallbackSubtext: {
    fontSize: 16,
    color: '#666',
  },
});
