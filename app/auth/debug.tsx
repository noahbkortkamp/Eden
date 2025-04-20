import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Button } from 'react-native';
import { Text } from 'react-native-paper';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../utils/supabase';
import { useRouter } from 'expo-router';

export default function OAuthDebugScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]}: ${message}`]);
  };
  
  useEffect(() => {
    // Get initial URL
    Linking.getInitialURL().then(url => {
      addLog(`Initial URL: ${url || 'none'}`);
    });
    
    // Listen for URL changes
    const subscription = Linking.addEventListener('url', ({ url }) => {
      addLog(`URL event: ${url}`);
    });
    
    return () => subscription.remove();
  }, []);
  
  // Test the redirect URLs
  const testRedirectUrls = async () => {
    try {
      addLog('Testing redirect URLs...');
      
      const linkingUrl = Linking.createURL('auth/callback');
      addLog(`Linking URL: ${linkingUrl}`);
      
      const nativeUrl = `golfcoursereview://auth/callback`;
      addLog(`Native URL: ${nativeUrl}`);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Direct Google OAuth test with WebBrowser
  const testDirectGoogleOAuth = async () => {
    try {
      addLog('Starting direct Google OAuth test...');
      WebBrowser.maybeCompleteAuthSession();
      
      const redirectUrl = `golfcoursereview://auth/callback`;
      addLog(`Using redirect URL: ${redirectUrl}`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) {
        addLog(`Supabase OAuth error: ${error.message}`);
        return;
      }
      
      if (!data?.url) {
        addLog(`No auth URL provided by Supabase`);
        return;
      }
      
      addLog(`Got auth URL from Supabase, opening browser...`);
      
      // Use WebBrowser directly
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );
      
      addLog(`Browser result type: ${result.type}`);
      
      if (result.type === 'success' && result.url) {
        addLog(`Auth successful with URL: ${result.url.substring(0, 50)}...`);
        
        try {
          addLog(`Processing callback URL...`);
          
          // Try to set session from URL
          try {
            // Extract token parameters from URL and set session
            await handleDeepLink(result.url);
            addLog(`Deep link processed`);
          } catch (e) {
            addLog(`Error processing deep link: ${e instanceof Error ? e.message : String(e)}`);
          }
          
          // Try to get session
          addLog(`Checking for session...`);
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData?.session) {
            addLog(`Session found: ${sessionData.session.user.id}`);
            addLog(`User email: ${sessionData.session.user.email}`);
            addLog(`Provider: ${sessionData.session.user.app_metadata.provider}`);
          } else {
            addLog(`No session found after OAuth`);
          }
        } catch (e) {
          addLog(`Error processing callback: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        addLog(`Auth flow ended without success: ${result.type}`);
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Custom deep link handler for debug screen
  const handleDeepLink = async (url: string) => {
    addLog(`Processing URL: ${url}`);
    try {
      // Parse the URL
      const parsedUrl = Linking.parse(url);
      addLog(`Parsed URL params: ${JSON.stringify(parsedUrl.queryParams)}`);
      
      // Check for tokens in various formats
      if (parsedUrl.queryParams?.access_token) {
        addLog(`Found access_token in query params`);
        const accessToken = parsedUrl.queryParams.access_token as string;
        const refreshToken = parsedUrl.queryParams.refresh_token as string || '';
        
        addLog(`Setting session from tokens`);
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return true;
      }
      
      // Check for hash format (#access_token=...)
      if (url.includes('#access_token=')) {
        addLog(`Found access_token in URL hash`);
        const hash = url.split('#')[1];
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token') || '';
        
        if (accessToken) {
          addLog(`Setting session from hash tokens`);
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return true;
        }
      }
      
      addLog(`No tokens found in the URL`);
      return false;
    } catch (error) {
      addLog(`Error handling deep link: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };
  
  // Get current session
  const checkSession = async () => {
    try {
      addLog('Checking current session...');
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`Session error: ${error.message}`);
        return;
      }
      
      if (data.session) {
        addLog(`Session found: ${data.session.user.id}`);
        addLog(`User email: ${data.session.user.email}`);
        addLog(`Auth provider: ${data.session.user.app_metadata.provider || 'email'}`);
        
        // Navigate to the main app if authenticated
        const shouldNavigate = confirm('Session found! Navigate to main app?');
        if (shouldNavigate) {
          if (data.session.user.user_metadata?.onboardingComplete === false) {
            router.replace('/onboarding/frequency');
          } else {
            router.replace('/(tabs)/search');
          }
        }
      } else {
        addLog('No active session found');
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAuth Debug Screen</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Redirect URLs" onPress={testRedirectUrls} />
        <Button title="Direct Google OAuth" onPress={testDirectGoogleOAuth} />
        <Button title="Check Session" onPress={checkSession} />
        <Button title="Clear Logs" onPress={() => setLogs([])} />
      </View>
      
      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Debug Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
}); 