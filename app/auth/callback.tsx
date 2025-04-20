import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import * as Linking from 'expo-linking';
import { handleAuthDeepLink } from '../services/auth';

export default function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Processing authentication...');
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        setStatus('Initializing callback handler...');
        
        // Get the URL that launched this screen
        const url = await Linking.getInitialURL();
        console.log('Callback screen launched with URL:', url);
        console.log('URL params:', params);
        
        // If we have a URL, try to extract access token directly
        if (url) {
          setStatus('Processing callback URL...');
          console.log('Attempting to process URL directly:', url);
          
          // Try to extract tokens from the URL
          const processed = handleAuthDeepLink(url);
          if (processed) {
            console.log('Successfully processed deep link');
            setStatus('Authentication successful, getting session...');
          }
        }
        
        // Get the session (whether we processed the URL or not)
        setStatus('Retrieving session from Supabase...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Failed to get session:', error);
          setStatus('Error getting session');
          setError(error.message);
          setDetailedError(JSON.stringify(error, null, 2));
          return;
        }

        if (!data.session) {
          console.log('No session found after OAuth flow');
          setStatus('Authentication incomplete');
          setError('No session found. The authentication process did not complete successfully.');
          return;
        }

        // Log success and user details
        console.log('Auth successful! User ID:', data.session.user.id);
        console.log('Provider:', data.session.user.app_metadata.provider);
        setStatus('Successfully authenticated! Redirecting...');
        
        // Small delay to ensure session is fully processed
        setTimeout(() => {
          // Check if the user needs to complete onboarding
          const currentUser = data.session.user;
          if (currentUser && currentUser.user_metadata?.onboardingComplete === false) {
            console.log('Redirecting to onboarding');
            router.replace('/onboarding/frequency');
          } else {
            // Direct users to the search tab
            console.log('Redirecting to main app');
            router.replace('/(tabs)/search');
          }
        }, 1000);
      } catch (err) {
        console.error('Unhandled error during OAuth callback:', err);
        setStatus('Unhandled exception');
        if (err instanceof Error) {
          setError(err.message);
          setDetailedError(err.stack || 'No stack trace available');
        } else {
          setError('An unknown error occurred');
          setDetailedError(JSON.stringify(err, null, 2));
        }
      }
    }

    handleOAuthCallback();
  }, [router, params]);

  const retryAuth = async () => {
    try {
      setStatus('Manually checking session...');
      setError(null);
      setDetailedError(null);
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setError(`Session check failed: ${error.message}`);
        return;
      }
      
      if (data.session) {
        setStatus('Session found! Redirecting...');
        
        // Check onboarding status and redirect
        const currentUser = data.session.user;
        if (currentUser && currentUser.user_metadata?.onboardingComplete === false) {
          router.replace('/onboarding/frequency');
        } else {
          router.replace('/(tabs)/search');
        }
      } else {
        setError('Still no session found. Please try logging in again.');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const goToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Authentication Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          {detailedError && (
            <View style={styles.detailedErrorContainer}>
              <Text style={styles.detailedErrorTitle}>Technical Details:</Text>
              <Text style={styles.detailedErrorMessage}>{detailedError}</Text>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={retryAuth} 
              style={styles.button}
              buttonColor="#245E2C"
            >
              Retry
            </Button>
            <Button 
              mode="outlined" 
              onPress={goToLogin} 
              style={styles.button}
            >
              Back to Login
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#245E2C" />
          <Text style={styles.loadingText}>Completing sign in...</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    width: '100%',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailedErrorContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    width: '100%',
  },
  detailedErrorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailedErrorMessage: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    marginHorizontal: 10,
    minWidth: 120,
  },
}); 