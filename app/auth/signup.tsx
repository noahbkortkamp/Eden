import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

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
      
      // If we get here, signup was successful
      // Will navigate through onboarding first, then to first-review
      router.replace('/onboarding/frequency');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>Check Your Email</Text>
        <Text style={styles.message}>
          We've sent a confirmation link to {email}. Please check your email and click the link to complete your registration.
        </Text>
        <Text style={styles.submessage}>
          After confirming your email, you can return to the app and log in.
        </Text>
        <Link href="/auth/login" asChild>
          <Button 
            mode="contained" 
            style={styles.button}
            buttonColor="#245E2C"
          >
            Return to Login
          </Button>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>Create your account</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        label="Full Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        disabled={loading}
        mode="outlined"
        outlineColor="#ddd"
        activeOutlineColor="#245E2C"
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
        outlineColor="#ddd"
        activeOutlineColor="#245E2C"
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
        outlineColor="#ddd"
        activeOutlineColor="#245E2C"
        right={
          <TextInput.Icon 
            icon={showPassword ? 'eye-off' : 'eye'} 
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        disabled={loading}
        style={styles.button}
        buttonColor="#245E2C"
      >
        Continue
      </Button>
      
      <Text style={styles.terms}>
        By signing up, you agree to the Terms and Privacy Policy
      </Text>

      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <Link href="/auth/login">
          <Text style={styles.link}>Sign In</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 6,
  },
  error: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  link: {
    color: '#245E2C',
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  submessage: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  terms: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
}); 