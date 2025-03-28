import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const handleFrequencySelect = async (value: string) => {
    setSelectedFrequency(value);
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      
      // Store frequency in AsyncStorage for later
      await AsyncStorage.setItem('eden_golf_frequency', selectedFrequency || 'not_specified');
      
      // Navigate to next onboarding screen
      router.replace('/onboarding/course');
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
      
      // Navigate to next onboarding screen
      router.replace('/onboarding/course');
    } catch (error) {
      console.error('Error skipping frequency:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
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
        buttonColor="#245E2C"
      >
        Continue
      </Button>
      
      <Button
        mode="text"
        onPress={handleSkip}
        disabled={loading}
        style={styles.skipButton}
      >
        Skip
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  optionButton: {
    width: '48%',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  selectedOption: {
    backgroundColor: '#245E2C', // Masters green
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
  },
  continueButton: {
    marginTop: 16,
    backgroundColor: '#245E2C', // Masters green
    padding: 8,
  },
  skipButton: {
    marginTop: 8,
  },
}); 