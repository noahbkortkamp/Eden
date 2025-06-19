import { Platform } from 'react-native';

// Development/Mock Product IDs - Replace with real App Store Connect IDs later
export const IAP_PRODUCT_IDS = {
  PREMIUM_MONTHLY: Platform.select({
    ios: 'com.noahkortkamp.golfcoursereview.premium.monthly',
    android: 'com.noahkortkamp.golfcoursereview.premium.monthly',
  }),
  PREMIUM_YEARLY: Platform.select({
    ios: 'com.noahkortkamp.golfcoursereview.premium.yearly',
    android: 'com.noahkortkamp.golfcoursereview.premium.yearly',
  }),
} as const;

// Subscription types
export type SubscriptionProductId = typeof IAP_PRODUCT_IDS[keyof typeof IAP_PRODUCT_IDS];

// Mock product data for development (will be replaced by real App Store data)
export const MOCK_PRODUCTS = [
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_MONTHLY,
    title: 'Premium Monthly',
    description: 'Unlock unlimited reviews and premium features',
    price: '$4.99',
    localizedPrice: '$4.99',
    currency: 'USD',
    type: 'subs',
    introductoryPriceNumberOfPeriodsIOS: '1',
    introductoryPricePaymentModeIOS: 'FREETRIAL',
    introductoryPriceSubscriptionPeriodIOS: 'WEEK',
  },
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
    title: 'Premium Yearly',
    description: 'Unlock unlimited reviews and premium features - Save 58%!',
    price: '$24.99',
    localizedPrice: '$24.99',
    currency: 'USD',
    type: 'subs',
    introductoryPriceNumberOfPeriodsIOS: '1',
    introductoryPricePaymentModeIOS: 'FREETRIAL',
    introductoryPriceSubscriptionPeriodIOS: 'WEEK',
  },
];

// Configuration for development vs production
export const IAP_CONFIG = {
  // Enable mock data during development
  USE_MOCK_DATA: __DEV__,
  
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

// Subscription status types
export type SubscriptionStatus = 
  | 'inactive'      // No active subscription
  | 'active'        // Active paid subscription
  | 'trial'         // In free trial period
  | 'expired'       // Subscription expired
  | 'grace_period'  // In grace period (payment issue)
  | 'paused'        // Subscription paused (Android)
  | 'unknown';      // Status unknown/loading

// Premium feature flags
export const PREMIUM_FEATURES = {
  UNLIMITED_REVIEWS: 'unlimited_reviews',
  SCORE_VISIBILITY: 'score_visibility',
  ADVANCED_RECOMMENDATIONS: 'advanced_recommendations',
  SOCIAL_FEATURES: 'social_features',
  EXPORT_DATA: 'export_data',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

// Feature access configuration
export const FEATURE_LIMITS = {
  FREE_REVIEW_LIMIT: 3,
  TRIAL_DURATION_DAYS: 7,
} as const; 