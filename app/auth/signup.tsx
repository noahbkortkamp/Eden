import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';

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
      setConfirmationSent(true);
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
          <Button mode="contained" style={styles.button}>
            Return to Login
          </Button>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        disabled={loading}
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
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError('');
        }}
        secureTextEntry
        style={styles.input}
        disabled={loading}
      />

      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Sign Up
      </Button>

      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <Link href="/auth/login">
          <Text style={styles.link}>Log In</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    color: '#2196F3',
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
}); 