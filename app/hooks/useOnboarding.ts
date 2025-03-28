import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

const ONBOARDING_STORAGE_KEY = 'eden_onboarding_complete';

/**
 * Hook to manage onboarding state with fallback to local storage for development
 */
export const useOnboarding = () => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check onboarding status from Supabase and fallback to AsyncStorage
  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      
      // First check Supabase user metadata
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.user_metadata?.onboardingComplete === true) {
        setIsOnboardingComplete(true);
        return;
      }
      
      // Fallback to AsyncStorage for development
      const storedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      setIsOnboardingComplete(storedValue === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  };

  // Complete onboarding in both Supabase and local storage
  const completeOnboarding = async () => {
    try {
      setLoading(true);
      
      // Update Supabase user metadata
      await supabase.auth.updateUser({
        data: { onboardingComplete: true }
      });
      
      // Also store in AsyncStorage for development
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset onboarding (for development testing)
  const resetOnboarding = async () => {
    try {
      setLoading(true);
      
      // Update Supabase user metadata
      await supabase.auth.updateUser({
        data: { 
          onboardingComplete: false,
          golfFrequency: null,
          homeCourse: null
        }
      });
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      
      setIsOnboardingComplete(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  return {
    isOnboardingComplete,
    loading,
    completeOnboarding,
    resetOnboarding,
    checkOnboardingStatus
  };
}; 