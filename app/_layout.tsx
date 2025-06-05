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
import './i18n';
import { PlayedCoursesProvider } from './context/PlayedCoursesContext';
import { CourseProvider } from './context/CourseContext';
import LoadingScreen from './components/LoadingScreen';

// ================================================================================================
// 🚨 CRITICAL DEBUG: This runs IMMEDIATELY when the app starts, before ANY other code
// ================================================================================================
console.log('🚨 CRITICAL: App startup timestamp:', new Date().toISOString());
console.log('🚨 CRITICAL: Platform detected:', Platform.OS);
console.log('🚨 CRITICAL: Development mode:', __DEV__);
console.log('🚨 CRITICAL: Node environment:', process.env.NODE_ENV);

// Check environment variables IMMEDIATELY
const envCheck = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  allExpoKeys: Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC'))
};

console.log('🚨 CRITICAL: Environment check results:', {
  supabaseUrlLength: envCheck.supabaseUrl.length,
  supabaseKeyLength: envCheck.supabaseKey.length,
  apiUrlLength: envCheck.apiUrl.length,
  supabaseUrlPresent: !!envCheck.supabaseUrl,
  supabaseKeyPresent: !!envCheck.supabaseKey,
  apiUrlPresent: !!envCheck.apiUrl,
  totalExpoKeys: envCheck.allExpoKeys.length,
  expoKeysList: envCheck.allExpoKeys
});

// IMMEDIATE Alert for production builds (this should show up even if app crashes later)
if (!__DEV__) {
  console.log('🚨 PRODUCTION BUILD DETECTED - Setting up immediate alert');
  
  // Use setTimeout to ensure this runs as soon as possible
  setTimeout(() => {
    const debugMessage = `🚨 PRODUCTION DEBUG 🚨

Environment Status:
• Supabase URL: ${envCheck.supabaseUrl ? '✅ Present' : '❌ Missing'} (${envCheck.supabaseUrl.length} chars)
• Supabase Key: ${envCheck.supabaseKey ? '✅ Present' : '❌ Missing'} (${envCheck.supabaseKey.length} chars)
• API URL: ${envCheck.apiUrl ? '✅ Present' : '❌ Missing'} (${envCheck.apiUrl.length} chars)

Platform: ${Platform.OS}
Total ENV Keys: ${envCheck.allExpoKeys.length}
Keys: ${envCheck.allExpoKeys.join(', ')}

Timestamp: ${new Date().toLocaleString()}`;

    console.log('🚨 Showing production debug alert...');
    Alert.alert('🚨 Production Debug', debugMessage, [
      { text: 'Copy Info', onPress: () => console.log('Debug info copied to console') },
      { text: 'Continue', style: 'default' }
    ]);
  }, 100); // Show as quickly as possible
}

// Comprehensive debugging for production issues
console.log('🚀 === APP INITIALIZATION DEBUG ===');
console.log('📱 Platform:', Platform.OS);
console.log('🛠️ DEV mode:', __DEV__);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('⏰ Timestamp:', new Date().toISOString());

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
  
  // Also show error in alert for TestFlight debugging
  useEffect(() => {
    if (!__DEV__) {
      setTimeout(() => {
        Alert.alert(
          '🚨 App Error Detected',
          `The app encountered an error during initialization:\n\n${error.message}\n\nStack: ${error.stack?.substring(0, 200)}...`,
          [{ text: 'OK' }]
        );
      }, 500);
    }
  }, [error]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: 'red', textAlign: 'center', marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
        {t('errors.failedToInitialize')}
      </Text>
      <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 14 }}>
        {error.message}
      </Text>
      <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 12, marginTop: 10 }}>
        {error.stack?.substring(0, 300)}...
      </Text>
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
        console.log('🌐 Window object available:', typeof window !== 'undefined');
        console.log('📋 WebBrowser available:', !!WebBrowser);
        
        if (Platform.OS === 'web' && window.frameworkReady) {
          console.log('🌐 Web platform detected, calling frameworkReady...');
          await window.frameworkReady();
          console.log('✅ Web frameworkReady completed');
        } else {
          console.log('📱 Native platform detected or no frameworkReady');
        }
        
        // Make sure WebBrowser can handle auth sessions
        console.log('🔧 Initializing WebBrowser auth session...');
        WebBrowser.maybeCompleteAuthSession();
        console.log('✅ WebBrowser auth session initialized');
        
        // Initialize deep linking for auth with better error handling
        console.log('🔗 Initializing auth deep links...');
        try {
          initializeAuthDeepLinks();
          console.log('✅ Deep linking initialized successfully');
        } catch (deepLinkError) {
          console.error('❌ Failed to initialize deep linking:', deepLinkError);
          // Don't throw here, deep linking failure shouldn't crash the app
        }
        
        console.log('✅ Framework initialization complete');
        setIsFrameworkLoading(false);
      } catch (err) {
        console.error('❌ Framework initialization failed:', err);
        console.error('❌ Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace',
          name: err instanceof Error ? err.name : 'Unknown error type'
        });
        
        // Show alert in production for debugging
        if (!__DEV__) {
          setTimeout(() => {
            Alert.alert(
              '🚨 Framework Init Error',
              `Framework initialization failed:\n\n${err instanceof Error ? err.message : 'Unknown error'}\n\nThis happened during app startup.`,
              [{ text: 'OK' }]
            );
          }, 200);
        }
        
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setIsFrameworkLoading(false);
      }
    };

    console.log('🚀 Starting framework initialization effect...');
    initializeFramework();
  }, []);

  // Show loading screen during framework initialization
  if (isFrameworkLoading) {
    console.log('⏳ Framework still loading, showing LoadingScreen...');
    return <LoadingScreen />;
  }

  if (error) {
    console.log('❌ Framework error detected, showing ErrorScreen...');
    return <ErrorScreen error={error} />;
  }

  console.log('🎉 Framework ready, rendering main app...');
  
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
