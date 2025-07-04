import { supabase } from '../config/supabase';
import { Linking, Platform } from 'react-native';
import { IAP_CONFIG } from '../config/iap';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: 'active' | 'inactive' | 'expired' | 'trial' | 'grace_period' | 'unknown';
  expirationDate?: string;
  isTrialPeriod: boolean;
  productId?: string;
  lastVerified?: string;
  needsRefresh?: boolean;
}

export interface SubscriptionVerification extends SubscriptionStatus {
  source: 'supabase' | 'apple';
  isVerified: boolean;
  lastAppleCheck?: string;
  discrepancy?: string;
}

class SubscriptionStatusService {
  private cache: Map<string, { data: SubscriptionStatus; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

  /**
   * Get subscription status from Supabase (primary source)
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      console.log('🔍 SubscriptionService: Fetching status from Supabase for user:', userId);

      // Check cache first
      const cached = this.getCachedStatus(userId);
      if (cached) {
        console.log('✅ SubscriptionService: Using cached status');
        return cached;
      }

      // Query Supabase using the enhanced function
      const { data, error } = await supabase
        .rpc('validate_subscription_status_enhanced', { user_id: userId });

      if (error) {
        console.error('❌ SubscriptionService: Supabase query error:', error);
        return this.getDefaultInactiveStatus();
      }

      console.log('📊 SubscriptionService: Raw Supabase data:', data);

      // The function returns an array, so we need the first (and only) result
      const subscriptionData = Array.isArray(data) ? data[0] : data;

      if (!subscriptionData) {
        console.log('📭 SubscriptionService: No subscription data found');
        return this.getDefaultInactiveStatus();
      }

      const status: SubscriptionStatus = {
        hasActiveSubscription: subscriptionData.has_active_subscription || false,
        subscriptionStatus: subscriptionData.subscription_status || 'inactive',
        expirationDate: subscriptionData.expiration_date,
        isTrialPeriod: subscriptionData.is_trial || false,
        productId: subscriptionData.product_id,
        needsRefresh: subscriptionData.needs_refresh || false,
        lastVerified: new Date().toISOString()
      };

      console.log('✅ SubscriptionService: Processed status:', status);

      // Cache the result
      this.setCachedStatus(userId, status);

      return status;
    } catch (error) {
      console.error('❌ SubscriptionService: Error fetching subscription status:', error);
      return this.getDefaultInactiveStatus();
    }
  }

  /**
   * Force refresh subscription status (bypasses cache)
   */
  async refreshSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    console.log('🔄 SubscriptionService: Force refreshing status for user:', userId);
    
    // Clear cache
    this.cache.delete(userId);
    
    // Mark subscription for refresh in Supabase
    try {
      await supabase.rpc('mark_subscription_for_refresh', { user_id: userId });
    } catch (error) {
      console.warn('⚠️ SubscriptionService: Could not mark for refresh:', error);
    }

    // Fetch fresh data
    return this.getSubscriptionStatus(userId);
  }

  /**
   * Get subscription verification (includes both Supabase and potential Apple data)
   */
  async getSubscriptionVerification(userId: string): Promise<SubscriptionVerification> {
    const supabaseStatus = await this.getSubscriptionStatus(userId);

    return {
      ...supabaseStatus,
      source: 'supabase',
      isVerified: true, // Supabase is our source of truth
      lastAppleCheck: undefined, // Only available in production with real Apple API
      discrepancy: undefined
    };
  }

  /**
   * Open Apple's subscription management page
   */
  async openAppleSubscriptionManagement(): Promise<boolean> {
    try {
      const url = IAP_CONFIG.MANAGE_SUBSCRIPTIONS_URL || 'https://apps.apple.com/account/subscriptions';
      
      console.log('🔗 SubscriptionService: Opening Apple subscription management');
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        console.warn('⚠️ SubscriptionService: Cannot open Apple subscription URL');
        return false;
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Error opening Apple subscription management:', error);
      return false;
    }
  }

  /**
   * Get debug information about subscription
   */
  async getSubscriptionDebugInfo(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_subscription_debug_info', { user_id: userId });

      if (error) {
        console.error('❌ SubscriptionService: Debug info error:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ SubscriptionService: Error getting debug info:', error);
      return null;
    }
  }

  /**
   * Cache management
   */
  private getCachedStatus(userId: string): SubscriptionStatus | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(userId);
      return null;
    }

    return cached.data;
  }

  private setCachedStatus(userId: string, status: SubscriptionStatus): void {
    this.cache.set(userId, {
      data: status,
      timestamp: Date.now()
    });
  }

  private getDefaultInactiveStatus(): SubscriptionStatus {
    return {
      hasActiveSubscription: false,
      subscriptionStatus: 'inactive',
      isTrialPeriod: false,
      lastVerified: new Date().toISOString()
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ SubscriptionService: Cache cleared');
  }
}

// Export singleton instance
export const subscriptionStatusService = new SubscriptionStatusService();
export default subscriptionStatusService; 