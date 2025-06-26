import { supabase } from './supabase';
import { IAP_CONFIG } from '../config/iap';

/**
 * Testing utilities for IAP and subscription management
 * These functions help test the app without real purchases
 */

export const TestingHelpers = {
  /**
   * Log current IAP configuration
   * Configuration is now determined at build time and cannot be changed at runtime
   */
  logIAPConfiguration: () => {
    console.log(`🧪 Testing: IAP Configuration:`);
    console.log(`   Use Mock Data: ${IAP_CONFIG.USE_MOCK_DATA}`);
    console.log(`   Allow Real IAP: ${IAP_CONFIG.ALLOW_REAL_IAP}`);
    console.log(`   Environment: ${IAP_CONFIG.ENVIRONMENT}`);
    console.log(`   Debug Info:`, IAP_CONFIG.DEBUG_ENVIRONMENT);
    console.log('🧪 Testing: Configuration is determined at build time');
    console.log('🧪 Testing: Use EXPO_PUBLIC_FORCE_REAL_IAP=true for real IAP in development');
  },

  /**
   * Enable/disable mock IAP mode
   * When enabled, all purchases will be simulated without real charges
   */
  setMockIAPMode: (enabled: boolean) => {
    console.warn('🧪 Testing: setMockIAPMode is deprecated!');
    console.warn('🧪 Testing: IAP configuration is now determined at build time');
    console.warn('🧪 Testing: Use EXPO_PUBLIC_FORCE_REAL_IAP environment variable instead');
    console.log(`🧪 Testing: Current Mock IAP mode: ${IAP_CONFIG.USE_MOCK_DATA ? 'ENABLED' : 'DISABLED'}`);
    console.log('🧪 Testing: To change this, rebuild with EXPO_PUBLIC_FORCE_REAL_IAP=true');
  },

  /**
   * Reset user's subscription status for testing
   * Useful to test paywall flows multiple times
   */
  resetSubscriptionStatus: async (userId: string) => {
    try {
      console.log('🧪 Testing: Resetting subscription status...');
      
      const { error } = await supabase
        .rpc('reset_user_subscription', { user_id: userId });

      if (error) {
        console.error('❌ Testing: Failed to reset subscription:', error);
        throw error;
      }

      console.log('✅ Testing: Subscription status reset - user is now free tier');
      return true;
    } catch (error) {
      console.error('❌ Testing: Error resetting subscription:', error);
      return false;
    }
  },

  /**
   * Grant premium access for testing (bypass IAP entirely)
   * Useful for testing premium features without purchase flow
   */
  grantTestPremiumAccess: async (userId: string, durationDays: number = 30) => {
    try {
      console.log(`🧪 Testing: Granting ${durationDays} days of premium access...`);
      
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);

      const { error } = await supabase
        .rpc('grant_test_premium_access', { 
          user_id: userId,
          expiration_date: expirationDate.toISOString()
        });

      if (error) {
        console.error('❌ Testing: Failed to grant premium access:', error);
        throw error;
      }

      console.log(`✅ Testing: Premium access granted until ${expirationDate.toLocaleDateString()}`);
      return true;
    } catch (error) {
      console.error('❌ Testing: Error granting premium access:', error);
      return false;
    }
  },

  /**
   * Reset user's review count for testing paywall triggers
   */
  resetReviewCount: async (userId: string) => {
    try {
      console.log('🧪 Testing: Resetting review count...');
      
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Testing: Failed to reset reviews:', error);
        throw error;
      }

      console.log('✅ Testing: All reviews deleted - user can test paywall trigger again');
      return true;
    } catch (error) {
      console.error('❌ Testing: Error resetting reviews:', error);
      return false;
    }
  },

  /**
   * Set specific review count for testing
   */
  setReviewCount: async (userId: string, count: number) => {
    try {
      console.log(`🧪 Testing: Setting review count to ${count}...`);
      
      // First reset
      await TestingHelpers.resetReviewCount(userId);
      
      // Then add the desired number of dummy reviews
      const dummyReviews = [];
      for (let i = 0; i < count; i++) {
        dummyReviews.push({
          user_id: userId,
          course_id: `test-course-${i}`,
          rating: 'love',
          date_played: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }

      if (dummyReviews.length > 0) {
        const { error } = await supabase
          .from('reviews')
          .insert(dummyReviews);

        if (error) {
          console.error('❌ Testing: Failed to create dummy reviews:', error);
          throw error;
        }
      }

      console.log(`✅ Testing: Review count set to ${count}`);
      return true;
    } catch (error) {
      console.error('❌ Testing: Error setting review count:', error);
      return false;
    }
  },

  /**
   * Log current testing status
   */
  logTestingStatus: async (userId: string) => {
    try {
      console.log('🧪 Testing Status:');
      console.log(`   Mock IAP Mode: ${IAP_CONFIG.USE_MOCK_DATA ? 'ENABLED' : 'DISABLED'}`);
      
      // Get subscription status
      const { data: subData } = await supabase
        .rpc('validate_subscription_status', { user_id: userId });
      
      const subscription = subData?.[0];
      console.log(`   Subscription: ${subscription?.subscription_status || 'inactive'}`);
      console.log(`   Has Access: ${subscription?.has_active_subscription || false}`);
      console.log(`   Trial: ${subscription?.is_trial || false}`);
      
      // Get review count
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      console.log(`   Review Count: ${count || 0}`);
      
    } catch (error) {
      console.error('❌ Testing: Error checking status:', error);
    }
  },

  /**
   * Test environment detection logic without making purchases
   * This helps verify the fix before building
   */
  testEnvironmentDetection: () => {
    console.log('🧪 Testing: Environment Detection Test');
    console.log('================================');
    
    // Test the same logic used in IAP service
    const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
    const isTestFlightOrProduction = !__DEV__ && !isExpoGo;
    const forceRealIAP = process.env.EXPO_PUBLIC_FORCE_REAL_IAP === 'true';
    const shouldUseMockData = __DEV__ && !forceRealIAP && !isTestFlightOrProduction;
    
    console.log('🔍 Current Environment:');
    console.log(`   __DEV__: ${__DEV__}`);
    console.log(`   isExpoGo: ${isExpoGo}`);
    console.log(`   isTestFlightOrProduction: ${isTestFlightOrProduction}`);
    console.log(`   EXPO_PUBLIC_FORCE_REAL_IAP: ${process.env.EXPO_PUBLIC_FORCE_REAL_IAP}`);
    console.log(`   forceRealIAP: ${forceRealIAP}`);
    console.log(`   shouldUseMockData: ${shouldUseMockData}`);
    
    console.log('\n🎯 Expected Behavior:');
    if (shouldUseMockData) {
      console.log('   → Will use MOCK products and purchases');
      console.log('   → Safe for development testing');
    } else {
      console.log('   → Will use REAL products and purchases');
      console.log('   → Requires sandbox Apple ID for testing');
    }
    
    console.log('\n📱 Build Environment Simulation:');
    console.log('   In TestFlight:');
    console.log('     __DEV__ = false');
    console.log('     isTestFlightOrProduction = true');
    console.log('     shouldUseMockData = false');
    console.log('     → Will use REAL IAP ✅');
    
    return {
      currentEnv: {
        __DEV__,
        isExpoGo,
        isTestFlightOrProduction,
        forceRealIAP,
        shouldUseMockData
      },
      testFlightBehavior: {
        __DEV__: false,
        isExpoGo: false,
        isTestFlightOrProduction: true,
        shouldUseMockData: false,
        willUseRealIAP: true
      }
    };
  }
};

// Export individual functions for easier imports
export const {
  setMockIAPMode,
  resetSubscriptionStatus,
  grantTestPremiumAccess,
  resetReviewCount,
  setReviewCount,
  logTestingStatus
} = TestingHelpers; 