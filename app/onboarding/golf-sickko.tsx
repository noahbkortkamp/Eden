import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { Text, Button, RadioButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { edenTheme } from '../theme/edenTheme';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';

export default function GolfSickkoScreen() {
  const { user } = useAuth();
  const [golfSicko, setGolfSicko] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isFormValid = !!golfSicko;

  const handleContinue = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          golf_sicko: golfSicko,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      // TODO: Navigate to next onboarding step
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { title: 'I dabble', subtitle: 'I play a few times per year', value: 'dabble' },
    { title: 'Catching the bug', subtitle: 'I play a couple times per month', value: 'catching_bug' },
    { title: 'Officially hooked', subtitle: 'I play once a week', value: 'hooked' },
    { title: "I'm a sicko", subtitle: 'I play multiple times per week', value: 'sicko' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>How much of a golf sicko are you?</Text>
            {options.map(option => (
              <TouchableWithoutFeedback key={option.value} onPress={() => setGolfSicko(option.value)}>
                <View
                  style={[
                    styles.card,
                    golfSicko === option.value && styles.cardSelected
                  ]}
                >
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
              </TouchableWithoutFeedback>
            ))}
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
    paddingTop: 48,
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
  card: {
    borderWidth: 1,
    borderColor: edenTheme.colors.border,
    borderRadius: edenTheme.borderRadius.lg,
    marginBottom: edenTheme.spacing.lg,
    backgroundColor: edenTheme.colors.background,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardSelected: {
    borderColor: edenTheme.colors.primary,
    backgroundColor: edenTheme.colors.primary + '10',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: edenTheme.colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: edenTheme.colors.textSecondary,
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