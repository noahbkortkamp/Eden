import { supabase } from './supabase';
import { Database } from './database.types';
import { 
  SubscriptionStatus, 
  PremiumFeature, 
  SubscriptionProductId,
  FEATURE_LIMITS 
} from '../config/iap';
import { 
  UserSubscription, 
  FeatureAccess, 
  SubscriptionEvent 
} from '../types/iap';

// Type aliases for database types
type DbUserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
type DbSubscriptionEvent = Database['public']['Tables']['subscription_events']['Row'];
type DbPremiumFeatureUsage = Database['public']['Tables']['premium_feature_usage']['Row'];

/**
 * Get current subscription status for a user
 */
export async function getUserSubscriptionStatus(userId: string): Promise<{
  hasActiveSubscription: boolean;
  subscriptionStatus: SubscriptionStatus;
  expirationDate: Date | null;
  isTrialActive: boolean;
  trialEndDate: Date | null;
  productId: SubscriptionProductId | null;
}> {
  try {
    const { data, error } = await supabase
      .rpc('validate_subscription_status', { user_id: userId });

    if (error) {
      console.error('Error checking subscription status:', error);
      throw error;
    }

    const result = data?.[0];
    if (!result) {
      return {
        hasActiveSubscription: false,
        subscriptionStatus: 'inactive',
        expirationDate: null,
        isTrialActive: false,
        trialEndDate: null,
        productId: null,
      };
    }

    return {
      hasActiveSubscription: result.has_active_subscription,
      subscriptionStatus: result.subscription_status as SubscriptionStatus,
      expirationDate: result.expiration_date ? new Date(result.expiration_date) : null,
      isTrialActive: result.is_trial,
      trialEndDate: result.trial_end_date ? new Date(result.trial_end_date) : null,
      productId: result.product_id as SubscriptionProductId,
    };
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    // Return safe defaults on error
    return {
      hasActiveSubscription: false,
      subscriptionStatus: 'inactive',
      expirationDate: null,
      isTrialActive: false,
      trialEndDate: null,
      productId: null,
    };
  }
}

/**
 * Check if user has access to a specific premium feature
 */
export async function checkFeatureAccess(
  userId: string, 
  feature: PremiumFeature
): Promise<FeatureAccess> {
  try {
    const { data, error } = await supabase
      .rpc('check_feature_access', { 
        user_id: userId, 
        feature_name: feature 
      });

    if (error) {
      console.error('Error checking feature access:', error);
      throw error;
    }

    const result = data?.[0];
    if (!result) {
      return {
        feature,
        hasAccess: false,
        requiresUpgrade: true,
        usageCount: 0,
        limit: 0,
      };
    }

    const limit = feature === 'unlimited_reviews' ? FEATURE_LIMITS.FREE_REVIEW_LIMIT : 0;

    return {
      feature,
      hasAccess: result.has_access,
      requiresUpgrade: result.is_premium_feature && !result.has_access,
      usageCount: result.usage_count,
      limit: result.limit_reached ? limit : undefined,
    };
  } catch (error) {
    console.error('Failed to check feature access:', error);
    return {
      feature,
      hasAccess: false,
      requiresUpgrade: true,
      usageCount: 0,
    };
  }
}

/**
 * Track usage of a premium feature
 */
export async function trackFeatureUsage(
  userId: string, 
  feature: PremiumFeature
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('track_feature_usage', { 
        user_id: userId, 
        feature_name: feature 
      });

    if (error) {
      console.error('Error tracking feature usage:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to track feature usage:', error);
    return false;
  }
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial', 'grace_period'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const subscription = data[0] as DbUserSubscription;
    
    return {
      id: subscription.id,
      userId: subscription.user_id,
      productId: subscription.product_id as SubscriptionProductId,
      status: subscription.status as SubscriptionStatus,
      startDate: new Date(subscription.start_date),
      expirationDate: subscription.expiration_date ? new Date(subscription.expiration_date) : undefined,
      isTrialPeriod: subscription.is_trial_period || false,
      trialEndDate: subscription.trial_end_date ? new Date(subscription.trial_end_date) : undefined,
      cancellationDate: subscription.cancellation_date ? new Date(subscription.cancellation_date) : undefined,
      lastReceiptValidation: subscription.last_receipt_validation ? new Date(subscription.last_receipt_validation) : undefined,
      receiptData: subscription.receipt_data || undefined,
      transactionId: subscription.latest_transaction_id || undefined,
      originalTransactionId: subscription.original_transaction_id || undefined,
      environment: subscription.environment as 'sandbox' | 'production',
      createdAt: new Date(subscription.created_at),
      updatedAt: new Date(subscription.updated_at),
    };
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    return null;
  }
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  userId: string,
  productId: SubscriptionProductId,
  status: SubscriptionStatus,
  expirationDate?: Date,
  transactionId?: string,
  receiptData?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('update_subscription_status', {
        user_id: userId,
        product_id: productId,
        new_status: status,
        expiration_date: expirationDate?.toISOString(),
        transaction_id: transactionId,
        receipt_data: receiptData,
      });

    if (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update subscription status:', error);
    return null;
  }
}

/**
 * Log subscription event
 */
export async function logSubscriptionEvent(
  userId: string,
  eventType: string,
  eventData?: any,
  subscriptionId?: string,
  productId?: SubscriptionProductId,
  transactionId?: string,
  error?: string
): Promise<string | null> {
  try {
    const { data, error: logError } = await supabase
      .rpc('log_subscription_event', {
        user_id: userId,
        event_type: eventType,
        event_data: eventData ? JSON.stringify(eventData) : null,
        subscription_id: subscriptionId,
        product_id: productId,
        transaction_id: transactionId,
        error_message: error,
      });

    if (logError) {
      console.error('Error logging subscription event:', logError);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to log subscription event:', err);
    return null;
  }
}

/**
 * Get subscription events for a user
 */
export async function getSubscriptionEvents(
  userId: string,
  limit: number = 50
): Promise<SubscriptionEvent[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching subscription events:', error);
      return [];
    }

    return (data as DbSubscriptionEvent[]).map(event => ({
      eventType: event.event_type as any,
      productId: event.product_id as SubscriptionProductId,
      transactionId: event.transaction_id || undefined,
      error: event.error_message || undefined,
      timestamp: new Date(event.created_at),
      userId: event.user_id,
    }));
  } catch (error) {
    console.error('Failed to get subscription events:', error);
    return [];
  }
}

/**
 * Get feature usage statistics for a user
 */
export async function getFeatureUsageStats(
  userId: string,
  feature?: PremiumFeature,
  days: number = 30
): Promise<DbPremiumFeatureUsage[]> {
  try {
    let query = supabase
      .from('premium_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('usage_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('usage_date', { ascending: false });

    if (feature) {
      query = query.eq('feature', feature);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feature usage stats:', error);
      return [];
    }

    return data as DbPremiumFeatureUsage[];
  } catch (error) {
    console.error('Failed to get feature usage stats:', error);
    return [];
  }
}

/**
 * Check if user is within review limits (integrates with existing review system)
 */
export async function checkReviewLimit(userId: string): Promise<{
  canSubmitReview: boolean;
  reviewsUsedToday: number;
  reviewLimit: number;
  requiresUpgrade: boolean;
}> {
  try {
    // Check subscription status first
    const subscriptionStatus = await getUserSubscriptionStatus(userId);
    
    if (subscriptionStatus.hasActiveSubscription) {
      return {
        canSubmitReview: true,
        reviewsUsedToday: 0,
        reviewLimit: -1, // Unlimited
        requiresUpgrade: false,
      };
    }

    // Check today's review count from existing reviews table
    const today = new Date().toISOString().split('T')[0];
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (error) {
      console.error('Error checking review count:', error);
      throw error;
    }

    const reviewsToday = reviews?.length || 0;
    const limit = FEATURE_LIMITS.FREE_REVIEW_LIMIT;

    return {
      canSubmitReview: reviewsToday < limit,
      reviewsUsedToday: reviewsToday,
      reviewLimit: limit,
      requiresUpgrade: reviewsToday >= limit,
    };
  } catch (error) {
    console.error('Failed to check review limit:', error);
    return {
      canSubmitReview: false,
      reviewsUsedToday: 0,
      reviewLimit: FEATURE_LIMITS.FREE_REVIEW_LIMIT,
      requiresUpgrade: true,
    };
  }
}

/**
 * Validate receipt with Supabase Edge Function
 */
export async function validateReceipt(
  platform: 'ios' | 'android',
  receiptData: string,
  productId: SubscriptionProductId,
  options?: {
    sharedSecret?: string;
    packageName?: string;
    purchaseToken?: string;
    environment?: 'sandbox' | 'production';
  }
): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        platform,
        receiptData,
        productId,
        ...options,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Receipt validation failed',
      };
    }

    return {
      success: true,
      transactionId: result.transactionId,
    };
  } catch (error) {
    console.error('Receipt validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if scores should be visible (integrates with existing review system)
 */
export async function shouldShowScores(userId: string): Promise<boolean> {
  try {
    const featureAccess = await checkFeatureAccess(userId, 'score_visibility');
    return featureAccess.hasAccess;
  } catch (error) {
    console.error('Failed to check score visibility:', error);
    return false;
  }
} 