import { SubscriptionStatus, PremiumFeature, SubscriptionProductId } from '../config/iap';

// React Native IAP types (from react-native-iap library)
export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  type: 'inapp' | 'subs';
  introductoryPrice?: string;
  introductoryPricePaymentModeIOS?: string;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: string;
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: string;
  freeTrialPeriodAndroid?: string;
  signatureAndroid?: string;
  [key: string]: any;
}

export interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string;
  dataAndroid?: string;
  signatureAndroid?: string;
  isAcknowledgedAndroid?: boolean;
  purchaseStateAndroid?: number;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  [key: string]: any;
}

export interface Subscription {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  transactionDate: number;
  originalTransactionDate: number;
  expirationDate?: number;
  isTrialPeriod?: boolean;
  isIntroductoryPricePeriod?: boolean;
  cancellationDate?: number;
  cancellationReason?: string;
  isUpgradeTransaction?: boolean;
  [key: string]: any;
}

// Application-specific subscription types
export interface UserSubscription {
  id: string;
  userId: string;
  productId: SubscriptionProductId;
  status: SubscriptionStatus;
  startDate: Date;
  expirationDate?: Date;
  isTrialPeriod: boolean;
  trialEndDate?: Date;
  cancellationDate?: Date;
  lastReceiptValidation?: Date;
  receiptData?: string;
  transactionId?: string;
  originalTransactionId?: string;
  environment: 'sandbox' | 'production';
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: SubscriptionProductId;
  name: string;
  description: string;
  price: string;
  currency: string;
  period: 'monthly' | 'yearly';
  features: PremiumFeature[];
  isPopular?: boolean;
  trialDays?: number;
  originalPrice?: string; // For showing discounts
  savings?: string; // e.g., "Save 58%"
}

export interface FeatureAccess {
  feature: PremiumFeature;
  hasAccess: boolean;
  requiresUpgrade: boolean;
  usageCount?: number;
  limit?: number;
}

export interface SubscriptionContext {
  // Subscription state
  status: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
  
  // Current subscription
  currentSubscription: UserSubscription | null;
  expirationDate: Date | null;
  isTrialActive: boolean;
  trialEndDate: Date | null;
  
  // Available products
  products: Product[];
  plans: SubscriptionPlan[];
  
  // Feature access
  hasFeatureAccess: (feature: PremiumFeature) => boolean;
  getFeatureAccess: (feature: PremiumFeature) => FeatureAccess;
  
  // Actions
  purchaseSubscription: (productId: SubscriptionProductId) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  manageSubscription: () => void;
  refreshSubscriptionStatus: () => Promise<void>;
}

// Purchase flow types
export interface PurchaseResult {
  success: boolean;
  purchase?: Purchase;
  error?: string;
  errorCode?: string;
}

export interface RestoreResult {
  success: boolean;
  purchases: Purchase[];
  error?: string;
}

// Error types
export interface IAPError {
  code: string;
  message: string;
  debugMessage?: string;
  canRetry: boolean;
}

// Analytics types
export interface SubscriptionEvent {
  eventType: 'purchase_initiated' | 'purchase_completed' | 'purchase_failed' | 'subscription_renewed' | 'subscription_cancelled' | 'restore_completed';
  productId?: SubscriptionProductId;
  transactionId?: string;
  error?: string;
  timestamp: Date;
  userId?: string;
}

// Paywall types
export interface PaywallConfig {
  title: string;
  subtitle: string;
  features: string[];
  showTrialInfo: boolean;
  trialDays?: number;
  primaryCTA: string;
  secondaryCTA?: string;
  dismissible: boolean;
}

export interface PaywallContext {
  trigger: 'review_limit' | 'score_access' | 'feature_access' | 'onboarding';
  feature?: PremiumFeature;
  config: PaywallConfig;
} 