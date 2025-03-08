import { supabase } from '../utils/supabase';
import { AuthError, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

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
export const handleAuthDeepLink = (url: string) => {
  console.log('Handling auth deep link:', url);
  // Extract the token and type from the URL
  const params = Linking.parse(url).queryParams as { access_token?: string; refresh_token?: string; type?: string };
  
  if (params?.access_token) {
    console.log('Setting session from deep link');
    return supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token || '',
    });
  }
  return null;
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

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}; 