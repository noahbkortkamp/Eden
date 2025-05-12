import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView, LayoutAnimation } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { errorHandler } from '../utils/errorHandling';
import { edenTheme } from '../theme/edenTheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  // Configure keyboard animations
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Keyboard.dismiss();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signIn(email, password);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Please make sure you have confirmed your email address and your credentials are correct.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      console.error('Google login error:', err);
      setError(errorHandler.getUserFriendlyMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          >
            <View style={styles.container}>
              <Text 
                variant="headlineLarge" 
                style={[styles.title, { 
                  fontFamily: edenTheme.typography.h1.fontFamily, 
                  fontWeight: edenTheme.typography.h1.fontWeight as any
                }]}
              >
                Welcome Back
              </Text>
              
              {error ? <Text style={styles.error}>{error}</Text> : null}

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
                  }
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
                  }
                }}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? 'eye-off' : 'eye'} 
                    color={edenTheme.colors.textSecondary}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || googleLoading}
                style={styles.button}
                buttonColor={edenTheme.components.button.primary.backgroundColor}
                labelStyle={{
                  fontFamily: edenTheme.typography.button.fontFamily,
                  fontWeight: edenTheme.typography.button.fontWeight as any,
                  color: edenTheme.typography.button.color,
                }}
              >
                Sign In
              </Button>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { color: edenTheme.colors.textSecondary }]}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <Button
                mode="outlined"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                disabled={loading || googleLoading}
                style={styles.googleButton}
                icon="google"
                textColor={edenTheme.components.button.secondary.color}
                labelStyle={{
                  fontFamily: edenTheme.typography.buttonSecondary.fontFamily,
                  fontWeight: edenTheme.typography.buttonSecondary.fontWeight as any,
                }}
                theme={{
                  colors: {
                    outline: edenTheme.components.button.secondary.borderColor,
                  }
                }}
              >
                Continue with Google
              </Button>

              <View style={styles.footer}>
                <Text style={{ color: edenTheme.colors.text }}>Don't have an account? </Text>
                <Link href="/auth/signup">
                  <Text style={[styles.link, { color: edenTheme.colors.primary }]}>Sign Up</Text>
                </Link>
              </View>
            </View>
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
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: edenTheme.spacing.lg,
    paddingHorizontal: edenTheme.spacing.xl,
    backgroundColor: edenTheme.colors.background,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: edenTheme.spacing.xl,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: edenTheme.spacing.md,
    backgroundColor: edenTheme.components.input.default.backgroundColor,
    borderRadius: edenTheme.borderRadius.sm,
  },
  button: {
    marginTop: edenTheme.spacing.md,
    borderRadius: edenTheme.borderRadius.md,
    paddingVertical: edenTheme.spacing.xs,
  },
  error: {
    color: edenTheme.colors.error,
    marginBottom: edenTheme.spacing.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: edenTheme.spacing.xl,
  },
  link: {
    fontWeight: edenTheme.typography.buttonSecondary.fontWeight as any,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: edenTheme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: edenTheme.colors.border,
  },
  dividerText: {
    marginHorizontal: edenTheme.spacing.xs,
  },
  googleButton: {
    borderRadius: edenTheme.borderRadius.md,
    paddingVertical: edenTheme.spacing.xs,
  },
}); 