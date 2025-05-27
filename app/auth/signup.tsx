import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView, LayoutAnimation } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { edenTheme } from '../theme/edenTheme';

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

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

  const handleSignUp = async () => {
    // Reset states
    setError('');
    setConfirmationSent(false);

    // Validate all fields
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await signUp({
        email: email.trim(),
        password,
        name
      });
      
      // Use a different navigation approach to avoid header issues
      router.push({
        pathname: '/onboarding/profile-info',
        params: { noHeader: 'true' }
      });
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <View style={styles.container}>
            <Text 
              variant="headlineMedium" 
              style={[styles.title, { 
                fontFamily: edenTheme.typography.h2.fontFamily, 
                fontWeight: edenTheme.typography.h2.fontWeight as any
              }]}
            >
              Check Your Email
            </Text>
            <Text style={[styles.message, { color: edenTheme.colors.text }]}>
              We've sent a confirmation link to {email}. Please check your email and click the link to complete your registration.
            </Text>
            <Text style={[styles.submessage, { color: edenTheme.colors.textSecondary }]}>
              After confirming your email, you can return to the app and log in.
            </Text>
            <Link href="/auth/login" asChild>
              <Button 
                mode="contained" 
                style={styles.button}
                buttonColor={edenTheme.components.button.primary.backgroundColor}
                labelStyle={{
                  fontFamily: edenTheme.typography.button.fontFamily,
                  fontWeight: edenTheme.typography.button.fontWeight as any,
                  color: edenTheme.typography.button.color,
                }}
              >
                Return to Login
              </Button>
            </Link>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

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
                Create your account
              </Text>
              
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={edenTheme.components.input.default.borderColor}
                activeOutlineColor={edenTheme.colors.primary}
                theme={{
                  colors: {
                    background: edenTheme.components.input.default.backgroundColor,
                    text: edenTheme.colors.text,
                  }
                }}
                returnKeyType="next"
                blurOnSubmit={false}
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text.trim());
                  setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                disabled={loading}
                mode="outlined"
                outlineColor={edenTheme.components.input.default.borderColor}
                activeOutlineColor={edenTheme.colors.primary}
                theme={{
                  colors: {
                    background: edenTheme.components.input.default.backgroundColor,
                    text: edenTheme.colors.text,
                  }
                }}
                returnKeyType="next"
                blurOnSubmit={false}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry={!showPassword}
                style={styles.input}
                disabled={loading}
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
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor={edenTheme.components.button.primary.backgroundColor}
                labelStyle={{
                  fontFamily: edenTheme.typography.button.fontFamily,
                  fontWeight: edenTheme.typography.button.fontWeight as any,
                  color: edenTheme.typography.button.color,
                }}
              >
                Continue
              </Button>
              
              <Text style={[styles.terms, { color: edenTheme.colors.textSecondary }]}>
                By signing up, you agree to the Terms and Privacy Policy
              </Text>

              <View style={styles.footer}>
                <Text style={{ color: edenTheme.colors.text }}>Already have an account? </Text>
                <Link href="/auth/login">
                  <Text style={[styles.link, { color: edenTheme.colors.primary }]}>Sign In</Text>
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
  message: {
    textAlign: 'center',
    marginBottom: edenTheme.spacing.md,
    fontSize: 16,
    lineHeight: 24,
  },
  submessage: {
    textAlign: 'center',
    marginBottom: edenTheme.spacing.lg,
  },
  terms: {
    fontSize: edenTheme.typography.caption.fontSize,
    textAlign: 'center',
    marginTop: edenTheme.spacing.md,
  },
}); 