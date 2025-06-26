import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { Text, TextInput, Button, RadioButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { edenTheme } from '../theme/edenTheme';
import { supabase } from '../utils/supabase';
import { useRouter } from 'expo-router';

export default function ProfileInfoScreen() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [golfSickko, setGolfSickko] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Pre-populate name if available from Google/Apple
  useEffect(() => {
    if (user && user.user_metadata) {
      const name = user.user_metadata.name || '';
      if (name && (!firstName && !lastName)) {
        const [first, ...rest] = name.split(' ');
        setFirstName(first || '');
        setLastName(rest.join(' '));
      }
    }
  }, [user]);

  const isFormValid = firstName.trim() && lastName.trim();

  const handleContinue = async () => {
    if (!isFormValid || !user) return;
    setLoading(true);
    setError('');
    try {
      // Import username generator
      const { generateUsername } = await import('../utils/usernameGenerator');
      
      // Create full name and generate username
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const username = generateUsername(fullName);
      
      console.log('Creating user profile with username:', username);
      
      // Check if user profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: username,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: username,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
      }
      
      console.log('User profile created/updated successfully');
      router.replace('/onboarding/golf-sickko');
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Tell us who you are</Text>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
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
              returnKeyType="next"
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
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
              returnKeyType="next"
            />
            <Button
              mode="contained"
              onPress={handleContinue}
              disabled={!isFormValid || loading}
              style={styles.button}
              buttonColor={edenTheme.components.button.primary.backgroundColor}
              labelStyle={styles.buttonText}
              loading={loading}
            >
              Continue
            </Button>
            {error ? <Text style={{ color: edenTheme.colors.error, marginTop: 8 }}>{error}</Text> : null}
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
  container: {
    flexGrow: 1,
    paddingHorizontal: edenTheme.spacing.xl,
    paddingTop: 12,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: edenTheme.colors.text,
    fontFamily: edenTheme.typography.h1.fontFamily,
    marginBottom: edenTheme.spacing.xl,
    textAlign: 'left',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: edenTheme.colors.text,
    marginBottom: 4,
    marginTop: edenTheme.spacing.md,
    textAlign: 'left',
  },
  input: {
    marginBottom: edenTheme.spacing.md,
    backgroundColor: edenTheme.components.input.default.backgroundColor,
    borderRadius: edenTheme.borderRadius.sm,
    height: 44,
  },
  radio: {
    marginVertical: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  radioCard: {
    borderWidth: 1,
    borderColor: edenTheme.colors.border,
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.md,
    backgroundColor: edenTheme.colors.background,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCardSelected: {
    borderColor: edenTheme.colors.primary,
    backgroundColor: edenTheme.colors.primary + '10', // subtle highlight
  },
  radioLabel: {
    fontSize: 16,
    color: edenTheme.colors.text,
  },
  button: {
    marginTop: edenTheme.spacing.lg,
    borderRadius: edenTheme.borderRadius.md,
    height: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
  },
}); 