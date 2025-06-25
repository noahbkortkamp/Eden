import { Platform } from 'react-native';

// Real App Store Connect Product IDs - Only Founders Membership
export const IAP_PRODUCT_IDS = {
  FOUNDERS_YEARLY: Platform.select({
    ios: 'com.noahkortkamp.golfcoursereview.founders.yearly',
    android: 'com.noahkortkamp.golfcoursereview.founders.yearly',
  }),
} as const;

// Export type for product IDs
export type SubscriptionProductId = typeof IAP_PRODUCT_IDS[keyof typeof IAP_PRODUCT_IDS];

// Premium features available with subscription
export type PremiumFeature = 
  | 'unlimited_reviews'
  | 'score_visibility'
  | 'advanced_recommendations'
  | 'social_features'
  | 'export_data'
  | 'priority_support';

export type SubscriptionStatus = 'active' | 'trial' | 'inactive' | 'expired' | 'cancelled' | 'grace_period';
export type SubscriptionEnvironment = 'sandbox' | 'production';

// Mock product data for development (will be replaced by real App Store data)
export const MOCK_PRODUCTS = [
  {
    productId: IAP_PRODUCT_IDS.FOUNDERS_YEARLY,
    title: 'Founders Membership',
    description: 'Lifetime founder pricing at $30/year with unlimited access',
    price: '$29.99',
    localizedPrice: '$29.99',
    currency: 'USD',
    type: 'subs',
    introductoryPriceNumberOfPeriodsIOS: '1',
    introductoryPricePaymentModeIOS: 'FREETRIAL',
    introductoryPriceSubscriptionPeriodIOS: 'WEEK',
  },
];

// Configuration for development vs production
export const IAP_CONFIG = {
  // BUGFIX: Use consistent environment detection logic
  // Mock data only in true development (not TestFlight)
  USE_MOCK_DATA: (() => {
    const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
    const isTestFlightOrProduction = !__DEV__ && !isExpoGo;
    const forceRealIAP = process.env.EXPO_PUBLIC_FORCE_REAL_IAP === 'true';
    // Only use mock data in development AND Expo Go, never in TestFlight
    return __DEV__ && isExpoGo && !forceRealIAP;
  })(),
  
  // Environment detection
  ENVIRONMENT: __DEV__ ? 'development' : 
               (process.env.EXPO_PUBLIC_ENV === 'staging' ? 'sandbox' : 'production'),
  
  // BUGFIX: Allow real IAP in TestFlight and production
  ALLOW_REAL_IAP: (() => {
    const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
    const isTestFlightOrProduction = !__DEV__ && !isExpoGo;
    const forceRealIAP = process.env.EXPO_PUBLIC_FORCE_REAL_IAP === 'true';
    // Allow real IAP in TestFlight/production or when explicitly forced
    return isTestFlightOrProduction || forceRealIAP || (!__DEV__ && !isExpoGo);
  })(),
  
  // DEBUG: Log environment detection
  DEBUG_ENVIRONMENT: {
    __DEV__: __DEV__,
    NODE_ENV: process.env.NODE_ENV,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
    EXPO_PUBLIC_FORCE_REAL_IAP: process.env.EXPO_PUBLIC_FORCE_REAL_IAP,
    IS_TESTFLIGHT: (() => {
      const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
      return !__DEV__ && !isExpoGo;
    })(),
  },
  
  // Connection timeout settings
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  INITIALIZATION_RETRY_DELAY: 2000, // 2 seconds
  
  // Receipt validation endpoint (will be created in Phase 2)
  RECEIPT_VALIDATION_ENDPOINT: '/api/validate-receipt',
  
  // Subscription management URLs
  MANAGE_SUBSCRIPTIONS_URL: Platform.select({
    ios: 'https://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions',
  }),
  
  // Error handling configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds
  
  // Cache configuration
  PRODUCT_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  SUBSCRIPTION_STATUS_CACHE_TTL: 30 * 1000, // 30 seconds
} as const;

// Feature limits for free users
export const FEATURE_LIMITS = {
  FREE_REVIEW_LIMIT: 15, // Total reviews allowed for free users (including trial)
  TRIAL_DURATION_DAYS: 7,
} as const;

// Subscription plans configuration (simplified to one plan)
export const SUBSCRIPTION_PLANS = [
  {
    id: IAP_PRODUCT_IDS.FOUNDERS_YEARLY,
    name: 'Founders Membership',
    description: 'Lifetime founder pricing with unlimited access to all features',
    price: '$29.99',
    currency: 'USD',
    period: 'yearly' as const,
    features: [
      'unlimited_reviews',
      'score_visibility', 
      'advanced_recommendations',
      'social_features',
      'export_data',
      'priority_support'
    ] as PremiumFeature[],
    isPopular: true,
    trialDays: 7,
    savings: 'Lifetime founder pricing',
  },
];

// Additional IAP configuration
export const IAP_FEATURE_CONFIG = {
  TRIAL_DURATION_DAYS: 7,
} as const; 