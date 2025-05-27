import { Redirect } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';
import * as authService from './services/auth';
import { router } from 'expo-router';
import { supabase } from './utils/supabase';

export default function Index() {
  const { user, loading } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<string>('checking');

  // Additional check to recover from auth state loss
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try to directly get the session from Supabase storage
        const session = await authService.getSession();
        
        if (session && !user) {
          console.log('Found session in storage but no user in context. Waiting for auth state to update.');
          setSessionStatus('found_session');
          
          // Try to get the user from the session
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            console.log('Retrieved user from session, checking metadata...');
            
            // Check if the user has inconsistent metadata flags
            const metadata = currentUser.user_metadata || {};
            console.log('User metadata:', metadata);
            
            if (metadata.firstReviewCompleted === true && metadata.onboardingComplete !== true) {
              console.log('Found inconsistent metadata: firstReviewCompleted is true but onboardingComplete is not true');
              
              // Fix the inconsistent metadata
              try {
                const { error: updateError } = await supabase.auth.updateUser({
                  data: { 
                    onboardingComplete: true
                  }
                });
                
                if (updateError) {
                  console.error('Error fixing inconsistent metadata:', updateError);
                } else {
                  console.log('Successfully fixed inconsistent metadata');
                }
              } catch (updateError) {
                console.error('Error fixing metadata:', updateError);
              }
            }
            
            setSessionStatus('ready');
            router.replace('/(tabs)/lists');
          } else {
            // If we have a session but can't get user, try refreshing the session
            const { data: refreshData } = await authService.refreshSession();
            if (refreshData?.user) {
              console.log('Session refreshed successfully, checking metadata...');
              
              // Check if the user has inconsistent metadata flags
              const metadata = refreshData.user.user_metadata || {};
              console.log('User metadata:', metadata);
              
              if (metadata.firstReviewCompleted === true && metadata.onboardingComplete !== true) {
                console.log('Found inconsistent metadata: firstReviewCompleted is true but onboardingComplete is not true');
                
                // Fix the inconsistent metadata
                try {
                  const { error: updateError } = await supabase.auth.updateUser({
                    data: { 
                      onboardingComplete: true
                    }
                  });
                  
                  if (updateError) {
                    console.error('Error fixing inconsistent metadata:', updateError);
                  } else {
                    console.log('Successfully fixed inconsistent metadata');
                  }
                } catch (updateError) {
                  console.error('Error fixing metadata:', updateError);
                }
              }
              
              router.replace('/(tabs)/lists');
            }
          }
        } else if (!session && !user) {
          console.log('No session found in storage and no user in context.');
          setSessionStatus('no_session');
        } else {
          console.log('Auth state consistent with session storage.');
          setSessionStatus('ready');
          
          // Check for metadata inconsistencies in user
          if (user && user.user_metadata) {
            const metadata = user.user_metadata || {};
            
            if (metadata.firstReviewCompleted === true && metadata.onboardingComplete !== true) {
              console.log('Found inconsistent metadata in current user: firstReviewCompleted is true but onboardingComplete is not true');
              
              // Fix the inconsistent metadata
              try {
                const { error: updateError } = await supabase.auth.updateUser({
                  data: { 
                    onboardingComplete: true
                  }
                });
                
                if (updateError) {
                  console.error('Error fixing inconsistent metadata:', updateError);
                } else {
                  console.log('Successfully fixed inconsistent metadata');
                }
              } catch (updateError) {
                console.error('Error fixing metadata:', updateError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSessionStatus('error');
      }
    };

    if (!loading) {
      checkSession();
    }
  }, [loading, user]);

  // Show loading spinner while checking auth
  if (loading || sessionStatus === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Checking login status...</Text>
      </View>
    );
  }

  // If we found a session but no user, wait a bit longer for auth state to sync
  if (sessionStatus === 'found_session') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#234D2C" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Restoring your session...</Text>
      </View>
    );
  }

  // If logged in, go to lists tab; otherwise go to welcome screen
  return user ? (
    <Redirect href="/(tabs)/lists" />
  ) : (
    <Redirect href="/(auth)/welcome" />
  );
} 