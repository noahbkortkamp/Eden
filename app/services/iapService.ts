import RNIap, {
  Product,
  Purchase,
  PurchaseResult,
  Subscription,
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  validateReceiptIos,
  validateReceiptAndroid,
  purchaseErrorListener,
  purchaseUpdatedListener,
  EmitterSubscription,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import { IAP_PRODUCT_IDS, MOCK_PRODUCTS } from '../config/iap';
import { 
  Product as IAPProduct, 
  Purchase as IAPPurchase, 
  SubscriptionStatus,
  UserSubscription,
  FeatureAccess 
} from '../types/iap';

class IAPService {
  private isInitialized = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private currentProducts: Product[] = [];
  private isDevelopment = __DEV__;

  /**
   * Initialize IAP connection and set up listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 IAP: Already initialized');
      return;
    }

    try {
      console.log('🚀 IAP: Initializing connection...');
      
      // Initialize connection to app store
      const result = await initConnection();
      console.log('✅ IAP: Connection initialized:', result);

      // Set up purchase update listener
      this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
        console.log('🎉 IAP: Purchase updated:', purchase);
        this.handlePurchaseUpdate(purchase);
      });

      // Set up purchase error listener
      this.purchaseErrorSubscription = purchaseErrorListener((error: any) => {
        console.error('❌ IAP: Purchase error:', error);
        this.handlePurchaseError(error);
      });

      // Load available products
      await this.loadProducts();

      this.isInitialized = true;
      console.log('✅ IAP: Service fully initialized');
      
    } catch (error) {
      console.error('❌ IAP: Initialization failed:', error);
      throw new Error(`Failed to initialize IAP: ${error.message}`);
    }
  }

  /**
   * Clean up IAP connection and listeners
   */
  async cleanup(): Promise<void> {
    console.log('🔄 IAP: Cleaning up...');
    
    try {
      // Remove listeners
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      // End connection
      await endConnection();
      this.isInitialized = false;
      
      console.log('✅ IAP: Cleanup complete');
    } catch (error) {
      console.error('❌ IAP: Cleanup error:', error);
    }
  }

  /**
   * Load available products from App Store
   */
  async loadProducts(): Promise<IAPProduct[]> {
    try {
      console.log('🔄 IAP: Loading products...');
      
      // In development, return mock products
      if (this.isDevelopment) {
        console.log('🛠️ IAP: Using mock products for development');
        return MOCK_PRODUCTS;
      }

      // Get product IDs
      const productIds = Object.values(IAP_PRODUCT_IDS).filter(Boolean) as string[];
      console.log('🔍 IAP: Fetching products for IDs:', productIds);

      // Fetch subscriptions from store
      const products = await getSubscriptions(productIds);
      console.log('✅ IAP: Loaded products:', products.length);
      
      this.currentProducts = products;
      
      // Convert to our internal format
      return products.map(this.convertToIAPProduct);
      
    } catch (error) {
      console.error('❌ IAP: Failed to load products:', error);
      
      // Fallback to mock products in case of error
      console.log('🔄 IAP: Falling back to mock products');
      return MOCK_PRODUCTS;
    }
  }

  /**
   * Get current subscription status for user
   */
  async getSubscriptionStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    subscriptionStatus: SubscriptionStatus;
    expirationDate?: Date;
    isTrialPeriod: boolean;
    productId?: string;
  }> {
    try {
      console.log(`🔍 IAP: Getting subscription status for user: ${userId}`);
      
      const { data, error } = await supabase
        .rpc('validate_subscription_status', { user_id: userId });

      if (error) {
        console.error('❌ IAP: Database error getting subscription status:', error);
        throw error;
      }

      const result = data?.[0] || {
        has_active_subscription: false,
        subscription_status: 'inactive',
        expiration_date: null,
        is_trial: false,
        product_id: null
      };

      return {
        hasActiveSubscription: result.has_active_subscription,
        subscriptionStatus: result.subscription_status as SubscriptionStatus,
        expirationDate: result.expiration_date ? new Date(result.expiration_date) : undefined,
        isTrialPeriod: result.is_trial,
        productId: result.product_id
      };
      
    } catch (error) {
      console.error('❌ IAP: Error getting subscription status:', error);
      
      // Return default inactive status on error
      return {
        hasActiveSubscription: false,
        subscriptionStatus: 'inactive',
        isTrialPeriod: false
      };
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<FeatureAccess> {
    try {
      console.log(`🔍 IAP: Checking feature access for ${feature} (user: ${userId})`);
      
      const { data, error } = await supabase
        .rpc('check_feature_access', { 
          user_id: userId, 
          feature_name: feature 
        });

      if (error) {
        console.error('❌ IAP: Database error checking feature access:', error);
        throw error;
      }

      const result = data?.[0] || {
        has_access: false,
        is_premium_feature: true,
        usage_count: 0,
        limit_reached: true
      };

      return {
        hasAccess: result.has_access,
        isPremiumFeature: result.is_premium_feature,
        usageCount: result.usage_count,
        limitReached: result.limit_reached
      };
      
    } catch (error) {
      console.error('❌ IAP: Error checking feature access:', error);
      
      // Return restrictive access on error
      return {
        hasAccess: false,
        isPremiumFeature: true,
        usageCount: 0,
        limitReached: true
      };
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      console.log(`🛒 IAP: Initiating purchase for product: ${productId}`);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // In development, simulate successful purchase
      if (this.isDevelopment) {
        console.log('🛠️ IAP: Simulating purchase for development');
        return await this.simulatePurchase(productId);
      }

      // Make the purchase
      const purchase = await requestSubscription(productId);
      console.log('✅ IAP: Purchase initiated:', purchase);
      
      return true;
      
    } catch (error) {
      console.error('❌ IAP: Purchase failed:', error);
      throw new Error(`Purchase failed: ${error.message}`);
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      console.log('🔄 IAP: Restoring purchases...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // This will trigger purchaseUpdatedListener for any valid purchases
      const purchases = await RNIap.getAvailablePurchases();
      console.log('✅ IAP: Found purchases to restore:', purchases.length);
      
      // Process each purchase
      for (const purchase of purchases) {
        await this.handlePurchaseUpdate(purchase);
      }

      return purchases.length > 0;
      
    } catch (error) {
      console.error('❌ IAP: Restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(userId: string, feature: string): Promise<void> {
    try {
      console.log(`📊 IAP: Tracking usage for feature: ${feature} (user: ${userId})`);
      
      const { error } = await supabase
        .rpc('track_feature_usage', {
          user_id: userId,
          feature_name: feature
        });

      if (error) {
        console.error('❌ IAP: Error tracking feature usage:', error);
        throw error;
      }
      
      console.log('✅ IAP: Feature usage tracked successfully');
      
    } catch (error) {
      console.error('❌ IAP: Failed to track feature usage:', error);
      // Don't throw - usage tracking shouldn't block the user
    }
  }

  // Private helper methods

  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    try {
      console.log('🔄 IAP: Processing purchase update:', purchase.transactionId);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ IAP: No user found for purchase processing');
        return;
      }

      // Validate receipt with server
      const isValid = await this.validateReceipt(purchase);
      
      if (isValid) {
        // Update subscription status in database
        await this.updateSubscriptionStatus(user.id, purchase);
        
        // Log successful purchase event
        await this.logSubscriptionEvent(user.id, 'purchase_completed', {
          transactionId: purchase.transactionId,
          productId: purchase.productId
        });
        
        console.log('✅ IAP: Purchase processed successfully');
      } else {
        console.error('❌ IAP: Receipt validation failed');
        
        // Log failed validation
        await this.logSubscriptionEvent(user.id, 'validation_failed', {
          transactionId: purchase.transactionId,
          productId: purchase.productId
        });
      }
      
      // Always finish the transaction
      await finishTransaction(purchase);
      
    } catch (error) {
      console.error('❌ IAP: Error processing purchase update:', error);
    }
  }

  private async handlePurchaseError(error: any): Promise<void> {
    console.error('🚨 IAP: Purchase error details:', error);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Log error event
      await this.logSubscriptionEvent(user.id, 'purchase_failed', {
        error: error.message || 'Unknown purchase error',
        code: error.code
      });
      
    } catch (logError) {
      console.error('❌ IAP: Failed to log purchase error:', logError);
    }
  }

  private async validateReceipt(purchase: Purchase): Promise<boolean> {
    try {
      console.log('🔍 IAP: Validating receipt...');
      
      // Call our Edge Function for receipt validation
      const { data, error } = await supabase.functions.invoke('validate-receipt', {
        body: {
          platform: Platform.OS,
          receiptData: purchase.transactionReceipt,
          productId: purchase.productId,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        console.error('❌ IAP: Receipt validation error:', error);
        return false;
      }

      const isValid = data?.isValid || false;
      console.log(`✅ IAP: Receipt validation result: ${isValid}`);
      
      return isValid;
      
    } catch (error) {
      console.error('❌ IAP: Receipt validation failed:', error);
      return false;
    }
  }

  private async updateSubscriptionStatus(userId: string, purchase: Purchase): Promise<void> {
    try {
      console.log('🔄 IAP: Updating subscription status...');
      
      // Calculate expiration date (example: 1 month for monthly, 1 year for yearly)
      const expirationDate = new Date();
      if (purchase.productId.includes('monthly')) {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else if (purchase.productId.includes('yearly')) {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .rpc('update_subscription_status', {
          user_id: userId,
          product_id: purchase.productId,
          new_status: 'active',
          expiration_date: expirationDate.toISOString(),
          transaction_id: purchase.transactionId,
          receipt_data: purchase.transactionReceipt
        });

      if (error) {
        console.error('❌ IAP: Error updating subscription status:', error);
        throw error;
      }
      
      console.log('✅ IAP: Subscription status updated successfully');
      
    } catch (error) {
      console.error('❌ IAP: Failed to update subscription status:', error);
      throw error;
    }
  }

  private async logSubscriptionEvent(userId: string, eventType: string, eventData: any): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('log_subscription_event', {
          user_id: userId,
          event_type: eventType,
          event_data: eventData
        });

      if (error) {
        console.error('❌ IAP: Error logging subscription event:', error);
      } else {
        console.log(`✅ IAP: Logged event: ${eventType}`);
      }
      
    } catch (error) {
      console.error('❌ IAP: Failed to log subscription event:', error);
    }
  }

  private async simulatePurchase(productId: string): Promise<boolean> {
    try {
      console.log('🛠️ IAP: Simulating purchase for development...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Simulate successful purchase
      const mockPurchase = {
        productId,
        transactionId: `mock_${Date.now()}`,
        transactionReceipt: 'mock_receipt_data',
        purchaseToken: 'mock_token'
      };

      // Update subscription status
      await this.updateSubscriptionStatus(user.id, mockPurchase as Purchase);
      
      // Log the simulated purchase
      await this.logSubscriptionEvent(user.id, 'purchase_completed', {
        transactionId: mockPurchase.transactionId,
        productId: mockPurchase.productId,
        simulated: true
      });

      console.log('✅ IAP: Simulated purchase completed');
      return true;
      
    } catch (error) {
      console.error('❌ IAP: Simulated purchase failed:', error);
      return false;
    }
  }

  private convertToIAPProduct(product: Product): IAPProduct {
    return {
      productId: product.productId,
      title: product.title || '',
      description: product.description || '',
      price: product.price || '',
      localizedPrice: product.localizedPrice || '',
      currency: product.currency || 'USD',
      type: 'subscription',
      subscriptionPeriod: product.subscriptionPeriodUnitIOS || 'month'
    };
  }
}

// Export singleton instance
export const iapService = new IAPService();

// Export individual functions for easier testing
export const {
  initialize: initializeIAP,
  cleanup: cleanupIAP,
  loadProducts,
  getSubscriptionStatus,
  checkFeatureAccess,
  purchaseSubscription,
  restorePurchases,
  trackFeatureUsage
} = iapService; 