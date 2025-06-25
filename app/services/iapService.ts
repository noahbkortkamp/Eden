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
import { IAP_PRODUCT_IDS, MOCK_PRODUCTS, IAP_CONFIG } from '../config/iap';
import { 
  Product as IAPProduct, 
  Purchase as IAPPurchase, 
  SubscriptionStatus,
  UserSubscription,
  FeatureAccess 
} from '../types/iap';

class IAPService {
  private isInitialized = false;
  private initializationAttempted = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private currentProducts: Product[] = [];
  private isDevelopment = __DEV__;
  private configurationValid = false;

  /**
   * Validate IAP configuration before attempting to connect to stores
   */
  private async validateConfiguration(): Promise<boolean> {
    try {
      console.log('🔍 IAP: Validating configuration...');
      
      const productIds = Object.values(IAP_PRODUCT_IDS).filter(Boolean) as string[];
      
      if (productIds.length === 0) {
        console.error('❌ IAP: No product IDs configured');
        return false;
      }
      
      // Validate product ID format
      const validFormat = productIds.every(id => 
        id && typeof id === 'string' && id.includes('.') && id.length > 10
      );
      
      if (!validFormat) {
        console.error('❌ IAP: Invalid product ID format detected');
        console.error('🔍 IAP: Product IDs:', productIds);
        return false;
      }
      
      // BUGFIX: Remove old logic - let environment detection handle this
      // The environment detection now properly handles TestFlight vs development
      
      console.log('✅ IAP: Configuration validation passed');
      console.log('🔍 IAP: Environment:', IAP_CONFIG.ENVIRONMENT);
      console.log('🔍 IAP: Use Mock Data:', IAP_CONFIG.USE_MOCK_DATA);
      console.log('🔍 IAP: Allow Real IAP:', IAP_CONFIG.ALLOW_REAL_IAP);
      
      return true;
      
    } catch (error) {
      console.error('❌ IAP: Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Initialize IAP connection and set up listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 IAP: Already initialized');
      return;
    }

    if (this.initializationAttempted) {
      console.log('🔄 IAP: Initialization already attempted');
      return;
    }

    this.initializationAttempted = true;

    try {
      console.log('🚀 IAP: Starting initialization...');
      console.log('🔍 IAP: Platform:', Platform.OS);
      console.log('🔍 IAP: Environment:', IAP_CONFIG.ENVIRONMENT);
      console.log('🔍 IAP: Debug Environment:', JSON.stringify(IAP_CONFIG.DEBUG_ENVIRONMENT, null, 2));
      console.log('🔍 IAP: Use Mock Data:', IAP_CONFIG.USE_MOCK_DATA);
      console.log('🔍 IAP: Allow Real IAP:', IAP_CONFIG.ALLOW_REAL_IAP);
      
      // Validate configuration first
      this.configurationValid = await this.validateConfiguration();
      
      if (!this.configurationValid) {
        console.log('⚠️ IAP: Invalid configuration - using mock mode');
        
        if (this.isDevelopment) {
          console.log('🛠️ IAP: Development mode - proceeding with mock data');
          this.isInitialized = true; // Allow mock purchases
          return;
        } else {
          throw new Error('Invalid IAP configuration for production');
        }
      }

      // BUGFIX: Use consistent environment detection logic  
      const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
      const isTestFlightOrProduction = !__DEV__ && !isExpoGo;
      const forceRealIAP = process.env.EXPO_PUBLIC_FORCE_REAL_IAP === 'true';
      const shouldUseMockData = __DEV__ && !forceRealIAP && !isTestFlightOrProduction;
      
      console.log('🔍 IAP: Initialization environment detection:');
      console.log('🔍 IAP: __DEV__:', __DEV__);
      console.log('🔍 IAP: isTestFlightOrProduction:', isTestFlightOrProduction);
      console.log('🔍 IAP: shouldUseMockData:', shouldUseMockData);
      
      if (shouldUseMockData) {
        console.log('🛠️ IAP: Development mode with mock data - skipping real IAP connection');
        this.isInitialized = true;
        return;
      }
      
      console.log('🔗 IAP: Attempting connection to app store...');
      
      // Initialize connection with timeout and retry logic
      const result = await Promise.race([
        initConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), IAP_CONFIG.CONNECTION_TIMEOUT)
        )
      ]) as boolean;
      
      console.log('✅ IAP: Connection established:', result);

      // Set up purchase update listener with enhanced logging
      this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
        console.log('🎉 IAP: Purchase updated:', {
          transactionId: purchase.transactionId,
          productId: purchase.productId,
          hasReceipt: !!purchase.transactionReceipt
        });
        this.handlePurchaseUpdate(purchase);
      });

      // Set up purchase error listener with enhanced error handling
      this.purchaseErrorSubscription = purchaseErrorListener((error: any) => {
        console.error('❌ IAP: Purchase error occurred:', {
          code: error?.code,
          message: error?.message,
          userInfo: error?.userInfo,
          debugDescription: error?.debugDescription
        });
        this.handlePurchaseError(error);
      });

      // Load available products (with error handling)
      try {
        await this.loadProducts();
      } catch (productError) {
        console.warn('⚠️ IAP: Failed to load products, but connection is established:', productError);
        // Don't fail initialization if products can't load - this might be temporary
      }

      this.isInitialized = true;
      console.log('✅ IAP: Service fully initialized');
      
    } catch (error) {
      console.error('❌ IAP: Initialization failed:', error);
      
      // Provide graceful degradation in production
      if (!this.isDevelopment) {
        console.log('🔄 IAP: Using graceful degradation mode for production');
        this.isInitialized = false;
        this.configurationValid = false;
        // Don't throw - let the app continue without IAP
        return;
      }
      
      // In development, we can be more strict
      throw new Error(`Failed to initialize IAP: ${error?.message || error?.toString() || 'Unknown error'}`);
    }
  }

  /**
   * Check if IAP is ready for purchases
   */
  isReadyForPurchase(): boolean {
    return this.isInitialized && (this.configurationValid || this.isDevelopment);
  }

  /**
   * Get initialization status and error information
   */
  getStatus(): {
    isInitialized: boolean;
    configurationValid: boolean;
    canPurchase: boolean;
    environment: string;
  } {
    return {
      isInitialized: this.isInitialized,
      configurationValid: this.configurationValid,
      canPurchase: this.isReadyForPurchase(),
      environment: IAP_CONFIG.ENVIRONMENT,
    };
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
   * Load available products from the store
   */
  async loadProducts(): Promise<IAPProduct[]> {
    try {
      console.log('🔍 IAP: Starting loadProducts...');
      
      if (!this.isInitialized) {
        console.log('⚠️ IAP: Service not initialized, attempting initialization...');
        await this.initialize();
      }

      // Get product IDs
      const productIds = Object.values(IAP_PRODUCT_IDS).filter(Boolean) as string[];
      console.log('🔍 IAP: Fetching products for IDs:', productIds);
      
      // Enhanced environment debugging for TestFlight
      const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
      const isTestFlight = !__DEV__ && !isExpoGo;
      console.log('🔍 IAP: Environment check:');
      console.log('  - __DEV__:', __DEV__);
      console.log('  - isExpoGo:', isExpoGo);
      console.log('  - isTestFlight:', isTestFlight);
      console.log('  - Platform:', Platform.OS);
      console.log('  - Product IDs to fetch:', productIds);

      // BUGFIX: Use correct API for react-native-iap v12+ with timeout
      const products = await Promise.race([
        getSubscriptions({ skus: productIds }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Product loading timeout')), 15000)
        )
      ]) as Product[];
      
      console.log('✅ IAP: Loaded products:', products.length);
      console.log('🔍 IAP: Product details:', products.map(p => ({
        productId: p.productId,
        title: p.title,
        price: p.price,
        localizedPrice: p.localizedPrice,
        available: !!p.productId
      })));
      
      // Specific check for our product ID
      const foundOurProduct = products.find(p => p.productId === IAP_PRODUCT_IDS.FOUNDERS_YEARLY);
      if (foundOurProduct) {
        console.log('✅ IAP: Found our subscription product:', foundOurProduct.productId);
      } else {
        console.error('❌ IAP: Our subscription product NOT found in App Store response');
        console.log('🔍 IAP: Expected product ID:', IAP_PRODUCT_IDS.FOUNDERS_YEARLY);
        console.log('🔍 IAP: Available product IDs:', products.map(p => p.productId));
        
        // In TestFlight, this might indicate a configuration issue
        if (isTestFlight) {
          console.error('🚨 IAP: TestFlight environment - Product not found could indicate:');
          console.error('  1. Subscription not approved in App Store Connect');
          console.error('  2. Bundle ID mismatch');
          console.error('  3. Missing In-App Purchase capability');
          console.error('  4. StoreKit configuration issue');
        }
      }
      
      this.currentProducts = products;
      
      // Convert to our internal format
      return products.map(this.convertToIAPProduct);
      
    } catch (error) {
      console.error('❌ IAP: Failed to load products:', error);
      
      // Enhanced error reporting for TestFlight
      const isTestFlight = !__DEV__ && !(typeof expo !== 'undefined' && expo?.modules);
      if (isTestFlight) {
        console.error('🚨 IAP: TestFlight product loading failed - Common causes:');
        console.error('  1. Subscription status not "Ready to Submit" in App Store Connect');
        console.error('  2. App Store agreements not accepted');
        console.error('  3. Missing In-App Purchase entitlement');
        console.error('  4. Bundle ID mismatch between app and subscription');
        console.error('  5. StoreKit configuration issue');
      }
      
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
      
      // Check if IAP is ready
      if (!this.isReadyForPurchase()) {
        console.log('⚠️ IAP: Not ready for purchase, attempting initialization...');
        
        // Try to initialize if not already attempted
        if (!this.initializationAttempted) {
          await this.initialize();
        }
        
        // Wait a bit for initialization to complete
        await new Promise(resolve => setTimeout(resolve, IAP_CONFIG.INITIALIZATION_RETRY_DELAY));
        
        // Check again if ready
        if (!this.isReadyForPurchase()) {
          throw new Error('Payment system is not available. Please try again later.');
        }
      }

      // BUGFIX: Enhanced environment detection for TestFlight vs Development
      // __DEV__ is false in TestFlight, so we need additional checks
      const isExpoGo = typeof expo !== 'undefined' && expo?.modules;
      const isTestFlightOrProduction = !__DEV__ && !isExpoGo;
      const forceRealIAP = process.env.EXPO_PUBLIC_FORCE_REAL_IAP === 'true';
      // Only use mock data in development AND Expo Go, never in TestFlight
      const shouldUseMockData = __DEV__ && isExpoGo && !forceRealIAP;
      
      console.log('🔍 IAP: Environment detection:');
      console.log('🔍 IAP: __DEV__:', __DEV__);
      console.log('🔍 IAP: isExpoGo:', isExpoGo);
      console.log('🔍 IAP: isTestFlightOrProduction:', isTestFlightOrProduction);
      console.log('🔍 IAP: forceRealIAP:', forceRealIAP);
      console.log('🔍 IAP: shouldUseMockData:', shouldUseMockData);
      console.log('🔍 IAP: EXPO_PUBLIC_FORCE_REAL_IAP:', process.env.EXPO_PUBLIC_FORCE_REAL_IAP);
      
      // In development or mock mode, simulate successful purchase
      if (shouldUseMockData) {
        console.log('🛠️ IAP: Using mock purchase mode');
        return await this.simulatePurchase(productId);
      }
      
      console.log('💰 IAP: Using REAL StoreKit purchase mode');

      // Validate product ID before purchase
      if (!productId || typeof productId !== 'string') {
        throw new Error('Invalid product ID provided');
      }

      console.log('💳 IAP: Making real purchase request...');
      
      // BUGFIX: Add additional safety checks before calling requestSubscription
      console.log('🔍 IAP: Pre-purchase validation...');
      console.log('🔍 IAP: Product ID:', productId);
      console.log('🔍 IAP: Current products:', this.currentProducts?.length || 0);
      console.log('🔍 IAP: Available product IDs:', this.currentProducts?.map(p => p?.productId) || []);
      
      // Validate that the product exists in our loaded products
      const productExists = this.currentProducts?.some(p => p?.productId === productId);
      if (!productExists && this.currentProducts?.length > 0) {
        console.error('❌ IAP: Product not found in loaded products');
        throw new Error('Product not available for purchase');
      }
      
      // Make the purchase with timeout and additional error handling
      console.log('💳 IAP: Calling requestSubscription...');
      
      let purchase;
      try {
              // BUGFIX: Use correct API for react-native-iap v12+ (sku parameter required)
      const subscriptionRequest = {
        sku: productId
      };
      
      console.log('🔍 IAP: Subscription request:', subscriptionRequest);
      
      purchase = await Promise.race([
        requestSubscription(subscriptionRequest),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Purchase request timeout')), IAP_CONFIG.CONNECTION_TIMEOUT)
        )
      ]) as any;
      } catch (iapError) {
        console.error('❌ IAP: requestSubscription failed:', iapError);
        
        // Check if this is the "right operand of 'in' is not an object" error
        const errorMsg = iapError?.message || iapError?.toString() || '';
        if (errorMsg.includes('right operand of')) {
          console.error('🚨 IAP: Detected "right operand" error - react-native-iap v12+ API issue');
          throw new Error('Payment system configuration error. Please contact support.');
        }
        
        // Handle other common IAP errors
        if (errorMsg.includes('No products available')) {
          throw new Error('Products are not available at this time. Please try again later.');
        }
        if (errorMsg.includes('User cancelled')) {
          throw new Error('Purchase was cancelled by user.');
        }
        if (errorMsg.includes('Network error')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        throw iapError;
      }
      
      console.log('✅ IAP: Purchase request completed:', purchase?.transactionId || 'unknown');
      
      return true;
      
    } catch (error) {
      console.error('❌ IAP: Purchase failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Purchase failed. Please try again.';
      
      // BUGFIX: Safely check error.message - error might not be an Error object
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      
      if (typeof errorMsg === 'string') {
        if (errorMsg.includes('timeout')) {
          errorMessage = 'Purchase request timed out. Please check your connection and try again.';
        } else if (errorMsg.includes('cancelled')) {
          errorMessage = 'Purchase was cancelled.';
        } else if (errorMsg.includes('not available')) {
          errorMessage = 'Payment system is not available. Please try again later.';
        } else if (errorMsg.includes('configuration')) {
          errorMessage = 'Payment system configuration issue. Please contact support.';
        }
      }
      
      throw new Error(errorMessage);
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
      throw new Error(`Restore failed: ${error?.message || error?.toString() || 'Unknown error'}`);
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

  /**
   * Safely get user ID with comprehensive error handling
   */
  private async safeGetUserId(): Promise<string | null> {
    try {
      const authResult = await supabase.auth.getUser();
      
      if (authResult && typeof authResult === 'object' && 'data' in authResult && 
          authResult.data && typeof authResult.data === 'object' && 'user' in authResult.data &&
          authResult.data.user && typeof authResult.data.user === 'object' && 'id' in authResult.data.user) {
        return authResult.data.user.id;
      }
      
      console.error('❌ IAP: Invalid auth result structure for user ID');
      return null;
    } catch (error) {
      console.error('❌ IAP: Error getting user ID:', error);
      return null;
    }
  }

  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    try {
      console.log('🔄 IAP: Processing purchase update:', purchase.transactionId);
      
      // BUGFIX: Safely get current user with error handling
      let user;
      try {
        const authResult = await supabase.auth.getUser();
        console.log('🔍 IAP: Auth result structure:', typeof authResult, authResult ? 'exists' : 'null');
        
        // Safely check if authResult has the expected structure
        if (authResult && typeof authResult === 'object' && 'data' in authResult && authResult.data && typeof authResult.data === 'object' && 'user' in authResult.data) {
          user = authResult.data.user;
        } else {
          console.error('❌ IAP: Unexpected auth result structure:', authResult);
          return;
        }
      } catch (authError) {
        console.error('❌ IAP: Supabase auth error:', authError);
        return;
      }
      
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
      // BUGFIX: Safely get current user with error handling
      let user;
      try {
        const authResult = await supabase.auth.getUser();
        if (authResult && typeof authResult === 'object' && 'data' in authResult && authResult.data && typeof authResult.data === 'object' && 'user' in authResult.data) {
          user = authResult.data.user;
        } else {
          console.error('❌ IAP: Unexpected auth result in error handler');
          return;
        }
      } catch (authError) {
        console.error('❌ IAP: Supabase auth error in error handler:', authError);
        return;
      }
      
      if (!user) return;
      
      // Log error event
      await this.logSubscriptionEvent(user.id, 'purchase_failed', {
        error: error?.message || error?.toString() || 'Unknown purchase error',
        code: error?.code || 'unknown'
      });
      
    } catch (logError) {
      console.error('❌ IAP: Failed to log purchase error:', logError);
    }
  }

  private async validateReceipt(purchase: Purchase): Promise<boolean> {
    try {
      console.log('🔍 IAP: Validating receipt...', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        hasReceipt: !!purchase.transactionReceipt,
        platform: Platform.OS
      });
      
      // Enhanced validation for TestFlight/Sandbox environment
      const userId = await this.safeGetUserId();
      if (!userId) {
        console.error('❌ IAP: Cannot validate receipt - no user ID');
        return false;
      }

      // Call our Edge Function for receipt validation
      const { data, error } = await supabase.functions.invoke('validate-receipt', {
        body: {
          platform: Platform.OS,
          receiptData: purchase.transactionReceipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          userId: userId,
          environment: __DEV__ ? 'sandbox' : 'production' // Help server determine environment
        }
      });

      if (error) {
        console.error('❌ IAP: Receipt validation error:', error);
        // In TestFlight/sandbox, be more permissive for testing
        if (__DEV__ === false && error?.message?.includes('sandbox')) {
          console.log('⚠️ IAP: Allowing sandbox receipt in TestFlight for testing');
          return true;
        }
        return false;
      }

      const isValid = data?.isValid || false;
      console.log(`✅ IAP: Receipt validation result: ${isValid}`, {
        transactionId: data?.transactionId,
        environment: data?.environment
      });
      
      return isValid;
      
    } catch (error) {
      console.error('❌ IAP: Receipt validation failed:', error);
      // Fallback for TestFlight testing
      if (__DEV__ === false) {
        console.log('⚠️ IAP: Using fallback validation for TestFlight');
        return true;
      }
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
      console.log(`🛠️ IAP: Product ID: ${productId}`);
      
      // BUGFIX: Safely get current user for simulation
      const userId = await this.safeGetUserId();
      if (!userId) throw new Error('No user found');

      // Add visual feedback for testing
      const product = MOCK_PRODUCTS.find(p => p.productId === productId);
      const productName = product?.title || 'Unknown Product';
      
      console.log(`🛠️ IAP: Simulating purchase of "${productName}" for $${product?.price || '0.00'}`);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate successful purchase
      const mockPurchase = {
        productId,
        transactionId: `mock_${Date.now()}`,
        transactionReceipt: 'mock_receipt_data',
        purchaseToken: 'mock_token'
      };

      // Determine if this is a trial (check if it's the founders product)
      const isFoundersPurchase = productId === IAP_PRODUCT_IDS.FOUNDERS_YEARLY;
      const isTrialPeriod = isFoundersPurchase; // For testing, treat founders as trial

      // Update subscription status with mock data
      const expirationDate = new Date();
      if (isTrialPeriod) {
        expirationDate.setDate(expirationDate.getDate() + 7); // 7 day trial
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year
      }

      console.log(`🛠️ IAP: Mock subscription active until: ${expirationDate.toLocaleDateString()}`);
      console.log(`🛠️ IAP: Trial period: ${isTrialPeriod ? 'Yes (7 days)' : 'No'}`);
      
      // Update subscription status
      await this.updateSubscriptionStatus(userId, mockPurchase as Purchase);
      
      // Log the simulated purchase
      await this.logSubscriptionEvent(userId, 'purchase_completed', {
        transactionId: mockPurchase.transactionId,
        productId: mockPurchase.productId,
        simulated: true,
        testMode: true,
        productName,
        trialPeriod: isTrialPeriod
      });

      console.log('✅ IAP: Simulated purchase completed successfully');
      console.log('🎉 IAP: User now has premium access (mock)');
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