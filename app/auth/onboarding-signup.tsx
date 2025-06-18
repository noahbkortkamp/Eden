import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, TouchableWithoutFeedback, Keyboard, ScrollView, Dimensions } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { edenTheme } from '../theme/edenTheme';
import { Ionicons } from '@expo/vector-icons';

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function OnboardingSignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardIsVisible, setKeyboardIsVisible] = useState(false);
  const { height: screenHeight } = Dimensions.get('window');
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  // Add keyboard listeners to track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardIsVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardIsVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError('Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      setError('');
      await signInWithApple();
    } catch (err) {
      setError('Apple sign-in failed.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      const result = await signUp({ email: email.trim(), password, name: '' });
      
      // Check if signup was successful (no error)
      if (!result?.error) {
        console.log('Sign up successful, redirecting to onboarding');
        // Navigate to the first onboarding screen
        router.replace('/onboarding/profile-info');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      // Check if this is a "user already exists" error
      // Supabase can return errors in different formats, so check multiple possible error formats
      const isUserExistsError = 
        err?.code === 'user_already_exists' || 
        err?.message?.includes('User already registered') ||
        err?.message?.includes('already registered') ||
        err?.message?.includes('already exists') ||
        (err?.message && err.message.toLowerCase().includes('user') && err.message.toLowerCase().includes('exist'));
      
      if (isUserExistsError) {
        // Show a message and redirect to login
        setError('An account with this email already exists. Please sign in instead.');
        
        // Short delay before redirecting
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      } else {
        // Show a more helpful error message based on the specific error
        if (err?.message) {
          setError(err.message);
        } else {
          setError('Sign up failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity onPress={() => router.replace('/auth/welcome')} hitSlop={16}>
            <Ionicons name="close" size={32} color={edenTheme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container, 
            { 
              paddingBottom: keyboardIsVisible ? screenHeight * 0.4 : 40,
              flexGrow: 1
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
            <View>
              <Text style={styles.title}>Create an Account</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              
              <Button
                mode="outlined"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                disabled={loading || googleLoading}
                style={styles.socialButton}
                icon="google"
                textColor={edenTheme.colors.text}
                labelStyle={styles.socialButtonText}
                theme={{ colors: { outline: edenTheme.colors.border } }}
              >
                Continue with Google
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleAppleSignIn}
                loading={appleLoading}
                disabled={loading || googleLoading || appleLoading}
                style={styles.socialButton}
                icon="apple"
                textColor={edenTheme.colors.text}
                labelStyle={styles.socialButtonText}
                theme={{ colors: { outline: edenTheme.colors.border } }}
              >
                Continue with Apple
              </Button>
              
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                mode="outlined"
                outlineColor={edenTheme.components.input.default.borderColor}
                activeOutlineColor={edenTheme.colors.primary}
                theme={{
                  colors: {
                    background: edenTheme.components.input.default.backgroundColor,
                    text: edenTheme.colors.text,
                  },
                }}
                blurOnSubmit={false}
                returnKeyType="next"
              />
              
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                mode="outlined"
                outlineColor={edenTheme.components.input.default.borderColor}
                activeOutlineColor={edenTheme.colors.primary}
                theme={{
                  colors: {
                    background: edenTheme.components.input.default.backgroundColor,
                    text: edenTheme.colors.text,
                  },
                }}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    color={edenTheme.colors.textSecondary}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                returnKeyType="done"
              />
              
              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading || !isValidEmail(email) || password.length < 6}
                style={styles.signupButton}
                buttonColor={edenTheme.components.button.primary.backgroundColor}
                labelStyle={styles.signupButtonText}
              >
                Sign Up
              </Button>
              
              <Text style={styles.termsText}>
                By continuing, you are agreeing to our{' '}
                <Text style={styles.linkText} onPress={() => { /* TODO: link to Terms */ }}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.linkText} onPress={() => { /* TODO: link to Privacy */ }}>Privacy Policy</Text>.
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: edenTheme.spacing.xl,
    paddingTop: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: edenTheme.spacing.xl,
    color: edenTheme.colors.text,
    fontFamily: edenTheme.typography.h1.fontFamily,
  },
  error: {
    color: '#C41E3A', // Darker red for better visibility
    marginBottom: edenTheme.spacing.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  socialButton: {
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.md,
    height: 44,
    justifyContent: 'center',
    backgroundColor: edenTheme.colors.background,
  },
  socialButtonText: {
    fontSize: 15,
    textAlign: 'center',
  },
  disabledAppleButton: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: edenTheme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: edenTheme.colors.border,
  },
  dividerText: {
    marginHorizontal: edenTheme.spacing.md,
    color: edenTheme.colors.textSecondary,
  },
  input: {
    marginBottom: edenTheme.spacing.md,
    backgroundColor: edenTheme.components.input.default.backgroundColor,
    height: 56,
  },
  signupButton: {
    marginTop: edenTheme.spacing.lg,
    borderRadius: edenTheme.borderRadius.md,
    height: 44,
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: edenTheme.typography.button.fontFamily,
    fontWeight: edenTheme.typography.button.fontWeight as any,
  },
  termsText: {
    marginTop: edenTheme.spacing.xl,
    fontSize: 13,
    textAlign: 'center',
    color: edenTheme.colors.textSecondary,
    lineHeight: 18,
  },
  linkText: {
    color: edenTheme.colors.primary,
  },
}); 