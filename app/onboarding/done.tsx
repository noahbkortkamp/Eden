import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { supabase } from '../utils/supabase';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reviewService } from '../services/reviewService';
import { userService } from '../services/userService';
import { edenTheme } from '../theme/edenTheme';

export default function DoneScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get user email for the verification message
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    
    getUserEmail();
  }, []);

  const handleComplete = async () => {
    try {
      setLoading(true);
      
      // Get stored preferences from AsyncStorage
      const golfFrequency = await AsyncStorage.getItem('eden_golf_frequency') || 'not_specified';
      
      // Set default value for home course since we no longer collect it
      const homeCourse = 'not_specified';
      
      // Save all preferences to Supabase
      await supabase.auth.updateUser({
        data: { 
          golfFrequency,
          homeCourse,
          onboardingComplete: true
        }
      });
      
      // Clear temporary storage
      await AsyncStorage.removeItem('eden_golf_frequency');
      
      // Check if user has any reviews or has completed their first review
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Check review count
          const reviewCount = await reviewService.getUserReviewCount(user.id);
          
          // Check if first review has been completed via metadata
          const hasCompletedFirstReview = await userService.hasCompletedFirstReview(user.id);
          
          console.log(`User has ${reviewCount} reviews, firstReviewCompleted: ${hasCompletedFirstReview}`);
          
          // Only show first review screen if they have 0 reviews AND haven't completed first review
          if (reviewCount === 0 && !hasCompletedFirstReview) {
            // Navigate to the first review screen
            console.log('User needs to complete first review, navigating to first-review screen');
            router.replace('/(auth)/first-review');
            return;
          }
        } catch (error) {
          console.error('Error checking review status:', error);
          // In case of error, continue with default flow
        }
      }
      
      // If we couldn't check reviews or user has reviews/completed first review, go to login
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text 
            variant="headlineMedium" 
            style={[styles.title, { 
              fontFamily: edenTheme.typography.h2.fontFamily, 
              fontWeight: edenTheme.typography.h2.fontWeight as any
            }]}
          >
            All set! One last step...
          </Text>
          
          <Text style={styles.subtitle}>
            Check your inbox at {email} to verify your email address.
          </Text>
          
          <Text style={[styles.message, { color: edenTheme.colors.textSecondary }]}>
            After confirming your email, you can log in and start tracking your golf journey.
          </Text>
          
          <Button
            mode="contained"
            onPress={handleComplete}
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
            Done
          </Button>
        </View>
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
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    padding: edenTheme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: edenTheme.spacing.lg,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: edenTheme.spacing.md,
    fontWeight: '500',
    lineHeight: 24,
    color: edenTheme.colors.text,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: edenTheme.spacing.xl,
    lineHeight: 24,
  },
  button: {
    borderRadius: edenTheme.borderRadius.md,
    paddingVertical: edenTheme.spacing.xs,
    width: '80%',
  },
}); 