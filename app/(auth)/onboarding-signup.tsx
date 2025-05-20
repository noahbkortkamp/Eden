import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
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
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

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
      await signUp({ email: email.trim(), password, name: '' });
      // After sign up, you may want to show a confirmation or move to next onboarding step
    } catch (err) {
      setError('Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={() => router.replace('/(auth)/welcome')} hitSlop={16}>
              <Ionicons name="close" size={32} color={edenTheme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.container, { flexGrow: 1, paddingBottom: 120 }]}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
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
              disabled
              style={[styles.socialButton, styles.disabledAppleButton]}
              icon="apple"
              textColor={edenTheme.colors.textSecondary}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    color: edenTheme.colors.error,
    marginBottom: edenTheme.spacing.md,
    textAlign: 'center',
  },
  socialButton: {
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.md,
    height: 44,
    justifyContent: 'center',
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
    fontSize: 16,
  },
  input: {
    marginBottom: edenTheme.spacing.md,
    backgroundColor: edenTheme.components.input.default.backgroundColor,
    borderRadius: edenTheme.borderRadius.sm,
    height: 44,
  },
  signupButton: {
    borderRadius: edenTheme.borderRadius.md,
    marginTop: edenTheme.spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  termsText: {
    fontSize: edenTheme.typography.caption.fontSize,
    textAlign: 'center',
    marginTop: edenTheme.spacing.lg,
    color: edenTheme.colors.textSecondary,
  },
  linkText: {
    color: edenTheme.colors.primary,
    textDecorationLine: 'underline',
  },
}); 