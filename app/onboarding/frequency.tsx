import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { edenTheme } from '../theme/edenTheme';

const frequencyOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Multiple times per week', value: 'multiple_weekly' },
  { label: "I'm a sicko", value: 'frequent' },
];

export default function FrequencyScreen() {
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Check if we have a noHeader parameter coming from signup
  useEffect(() => {
    // This will force the screen to use the modal presentation style
    if (params.noHeader === 'true') {
      console.log('Coming from signup flow, ensuring no header is shown');
    }
  }, [params]);

  const handleFrequencySelect = async (value: string) => {
    setSelectedFrequency(value);
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      
      // Store frequency in AsyncStorage for later
      await AsyncStorage.setItem('eden_golf_frequency', selectedFrequency || 'not_specified');
      
      // Navigate directly to done screen, skipping the course selection
      router.replace('/onboarding/done');
    } catch (error) {
      console.error('Error saving frequency:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      
      // Store default value
      await AsyncStorage.setItem('eden_golf_frequency', 'not_specified');
      
      // Navigate directly to done screen, skipping the course selection
      router.replace('/onboarding/done');
    } catch (error) {
      console.error('Error skipping frequency:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text 
          variant="headlineMedium" 
          style={[styles.title, { 
            fontFamily: edenTheme.typography.h2.fontFamily, 
            fontWeight: edenTheme.typography.h2.fontWeight as any
          }]}
        >
          How often do you play golf?
        </Text>
        
        <View style={styles.optionsGrid}>
          {frequencyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedFrequency === option.value && styles.selectedOption,
              ]}
              onPress={() => handleFrequencySelect(option.value)}
            >
              <Text 
                style={[
                  styles.optionText,
                  selectedFrequency === option.value && styles.selectedOptionText
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={loading || !selectedFrequency}
          style={styles.continueButton}
          buttonColor={edenTheme.components.button.primary.backgroundColor}
          labelStyle={{
            fontFamily: edenTheme.typography.button.fontFamily,
            fontWeight: edenTheme.typography.button.fontWeight as any,
            color: edenTheme.typography.button.color,
          }}
        >
          Continue
        </Button>
        
        <Button
          mode="text"
          onPress={handleSkip}
          disabled={loading}
          style={styles.skipButton}
          textColor={edenTheme.colors.textSecondary}
        >
          Skip
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: edenTheme.spacing.xl,
    paddingTop: 12,
    paddingBottom: 32,
  },
  title: {
    marginBottom: edenTheme.spacing.xl,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: edenTheme.spacing.xl,
  },
  optionButton: {
    width: '48%',
    padding: edenTheme.spacing.md,
    backgroundColor: edenTheme.colors.surface,
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  selectedOption: {
    backgroundColor: edenTheme.colors.primary,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: edenTheme.colors.text,
  },
  selectedOptionText: {
    color: edenTheme.colors.text.inverse || '#fff',
  },
  continueButton: {
    marginTop: edenTheme.spacing.md,
    borderRadius: edenTheme.borderRadius.md,
    paddingVertical: edenTheme.spacing.xs,
  },
  skipButton: {
    marginTop: edenTheme.spacing.xs,
  },
}); 