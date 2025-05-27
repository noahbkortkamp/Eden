import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { edenTheme } from '../theme/edenTheme';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingProgressBar({ currentStep, totalSteps }: OnboardingProgressBarProps) {
  // Create an array of steps for rendering
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>Step {currentStep} of {totalSteps}</Text>
      <View style={styles.progressContainer}>
        {steps.map((step) => (
          <React.Fragment key={step}>
            {/* Step circle */}
            <View
              style={[
                styles.stepCircle,
                step === currentStep && styles.currentStep,
                step < currentStep && styles.completedStep,
              ]}
            />
            {/* Connector line (except after the last step) */}
            {step < totalSteps && (
              <View
                style={[
                  styles.connector,
                  step < currentStep && styles.completedConnector,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20, // Further reduced from 30 to position it higher
    marginBottom: 14, // Slightly reduced bottom margin
    paddingHorizontal: edenTheme.spacing.xl,
    backgroundColor: edenTheme.colors.background, // Match the screen background
  },
  stepText: {
    fontSize: 16,
    color: edenTheme.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: edenTheme.colors.border,
    zIndex: 1,
  },
  currentStep: {
    backgroundColor: '#2E5E40', // Green color as shown in the screenshot
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  completedStep: {
    backgroundColor: '#2E5E40', // Same green for completed steps
  },
  connector: {
    height: 2,
    backgroundColor: edenTheme.colors.border,
    flex: 1,
    marginHorizontal: 4,
  },
  completedConnector: {
    backgroundColor: '#2E5E40', // Green for completed connectors
  },
}); 