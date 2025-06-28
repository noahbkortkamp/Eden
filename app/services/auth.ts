import { supabase } from '../utils/supabase';
import { AuthError, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthSessionResult, startAsync } from 'expo-auth-session';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Handle deep linking for auth
export const handleAuthDeepLink = async (url: string) => {
  try {
    console.log('Handling auth deep link:', url);
    
    // Parse the URL to extract tokens or fragments
    const parsedUrl = Linking.parse(url);
    console.log('Parsed URL:', JSON.stringify(parsedUrl, null, 2));
    
    // Case 1: Handle code exchange flow (most common with OAuth)
    if (parsedUrl.queryParams?.code) {
      console.log('Found authorization code in URL');
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        parsedUrl.queryParams.code as string
      );
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        return null;
      }
      
      console.log('Successfully exchanged code for session');
      return data;
    }
    
    // Case 2: Check for access token in query params
    if (parsedUrl.queryParams?.access_token) {
      console.log('Found access_token in query params');
      const accessToken = parsedUrl.queryParams.access_token as string;
      const refreshToken = parsedUrl.queryParams.refresh_token as string || '';
      
      console.log('Setting session from tokens in query params');
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (error) {
        console.error('Error setting session from query params:', error);
        return null;
      }
      
      return data;
    }
    
    // Case 3: Hash format (#access_token=...)
    if (url.includes('#')) {
      console.log('Found hash in URL, checking for tokens');
      const hash = url.split('#')[1];
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      
      if (accessToken) {
        console.log('Setting session from tokens in hash');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error('Error setting session from hash:', error);
          return null;
        }
        
        return data;
      }
    }
    
    // No tokens or code found
    console.log('No tokens or authorization code found in URL');
    return null;
  } catch (error) {
    console.error('Error handling deep link:', error);
    return null;
  }
};

// Initialize deep linking
export const initializeAuthDeepLinks = () => {
  // Handle deep links when app is already running
  Linking.addEventListener('url', ({ url }) => {
    console.log('Received deep link while running:', url);
    handleAuthDeepLink(url);
  });

  // Handle deep links that launched the app
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('App launched via deep link:', url);
      handleAuthDeepLink(url);
    }
  });
};

export const signUp = async ({ email, password, name }: SignUpData) => {
  console.log('Attempting to sign up with:', { email, name });
  
  try {
    const redirectTo = Linking.createURL('auth/confirm');
    console.log('Redirect URL:', redirectTo);
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toString().trim(),
      password: password.toString(),
      options: {
        data: {
          name: name.toString(),
          onboardingComplete: false,
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      throw error;
    }

    console.log('Signup successful:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Detailed signup error:', error);
    return { data: null, error: error as AuthError };
  }
};

export const signIn = async ({ email, password }: SignInData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in...');
    
    // Ensure any previous auth sessions are completed
    WebBrowser.maybeCompleteAuthSession();
    
    // Get the OAuth URL from Supabase - use development URL in dev mode
    let redirectUrl;
    if (__DEV__) {
      const localhost = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
      redirectUrl = `exp://${localhost}:19000/--/auth/callback`;
      console.log('Using development redirect URL:', redirectUrl);
    } else {
      redirectUrl = `golfcoursereview://auth/callback`;
      console.log('Using production redirect URL:', redirectUrl);
    }
    
    // Request the authorization URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      }
    });
    
    if (error) {
      console.error('Error getting Google OAuth URL:', error);
      throw error;
    }
    
    if (!data?.url) {
      console.error('No auth URL provided by Supabase');
      throw new Error('Authentication failed: No URL provided');
    }
    
    console.log('Opening browser for Google authentication...');
    
    // Open the auth URL in a browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );
    
    console.log('Browser session completed with result type:', result.type);
    
    if (result.type === 'success' && result.url) {
      console.log('OAuth flow completed successfully');
      
      // Process the redirect URL - this now handles code exchange properly
      console.log('Processing callback URL...');
      const sessionData = await handleAuthDeepLink(result.url);
      
      if (sessionData?.session) {
        console.log('Session successfully established:', sessionData.session.user.id);
        
        // Check if this is a new user (no onboardingComplete metadata set)
        const user = sessionData.session.user;
        console.log('Google user metadata:', user.user_metadata);
        
        // More robust check for new users
        const onboardingComplete = user.user_metadata?.onboardingComplete;
        const isNewUser = onboardingComplete === undefined || onboardingComplete === null;
        
        if (isNewUser) {
          console.log('New Google user detected, setting initial metadata...');
          
          // Set initial metadata for new Google users
          const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Google User';
          
          try {
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: {
                name: name,
                onboardingComplete: false,
                provider: 'google',
              }
            });
            
            if (updateError) {
              console.error('Error setting initial metadata for Google user:', updateError);
            } else {
              console.log('Successfully set initial metadata for new Google user');
              // Update the session data with the new metadata
              if (updateData?.user) {
                sessionData.session.user = updateData.user;
              }
            }
          } catch (metadataError) {
            console.error('Error setting initial metadata for Google user:', metadataError);
            // Don't throw - we can still continue with the sign-in
          }
        }
        
        return sessionData;
      }
      
      // If we couldn't get session from the callback, try getting it directly
      console.log('Trying to get session directly...');
      const { data: directSession } = await supabase.auth.getSession();
      
      if (directSession?.session) {
        console.log('Retrieved session directly:', directSession.session.user.id);
        
        // Check if this is a new user for direct session as well
        const user = directSession.session.user;
        console.log('Google user metadata (direct):', user.user_metadata);
        
        const onboardingComplete = user.user_metadata?.onboardingComplete;
        const isNewUser = onboardingComplete === undefined || onboardingComplete === null;
        
        if (isNewUser) {
          console.log('New Google user detected (direct session), setting initial metadata...');
          
          const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Google User';
          
          try {
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: {
                name: name,
                onboardingComplete: false,
                provider: 'google',
              }
            });
            
            if (updateError) {
              console.error('Error setting initial metadata for Google user (direct):', updateError);
            } else {
              console.log('Successfully set initial metadata for new Google user (direct session)');
              // Update the session data with the new metadata
              if (updateData?.user) {
                directSession.session.user = updateData.user;
              }
            }
          } catch (metadataError) {
            console.error('Error setting initial metadata for Google user (direct session):', metadataError);
          }
        }
        
        return directSession;
      }
      
      console.error('No session after successful OAuth');
      throw new Error('Authentication successful but session creation failed');
    } else {
      console.log('Browser session ended without success:', result.type);
      throw new Error('Authentication was cancelled or failed');
    }
  } catch (error) {
    console.error('Error in Google sign-in:', error);
    throw error;
  }
};

export const signInWithApple = async () => {
  try {
    console.log('Starting Apple sign-in...');
    
    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device');
    }
    
    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('Apple credential received:', credential);

    if (credential.identityToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      });

      if (error) {
        console.error('Supabase Apple sign-in error:', error);
        throw error;
      }

      console.log('Apple sign-in successful:', data);

      // Check if this is a new user (no onboardingComplete metadata set)
      if (data?.session?.user) {
        const user = data.session.user;
        console.log('Apple user metadata:', user.user_metadata);
        
        // More robust check for new users
        const onboardingComplete = user.user_metadata?.onboardingComplete;
        const isNewUser = onboardingComplete === undefined || onboardingComplete === null;
        
        if (isNewUser) {
          console.log('New Apple user detected, setting initial metadata...');
          
          // Set initial metadata for new Apple users
          const fullName = credential.fullName;
          const firstName = fullName?.givenName || '';
          const lastName = fullName?.familyName || '';
          const name = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'Apple User';
          
          try {
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
              data: {
                name: name,
                onboardingComplete: false,
                provider: 'apple',
              }
            });
            
            if (updateError) {
              console.error('Error setting initial metadata for Apple user:', updateError);
            } else {
              console.log('Successfully set initial metadata for new Apple user');
              // Update the session data with the new metadata
              if (updateData?.user) {
                data.session.user = updateData.user;
              }
            }
          } catch (metadataError) {
            console.error('Error setting initial metadata for Apple user:', metadataError);
            // Don't throw - we can still continue with the sign-in
          }
        }
      }

      return data;
    } else {
      throw new Error('No identity token received from Apple');
    }
  } catch (error) {
    console.error('Apple sign-in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const onAuthStateChange = (callback: (user: User | null, event?: string) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, event);
  });
};

export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data;
}; 