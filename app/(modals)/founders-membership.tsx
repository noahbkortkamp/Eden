import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Typography } from '../components/eden';
import { useEdenTheme } from '../theme';
import { EDEN_COLORS } from '../theme/edenColors';
import { IAP_PRODUCT_IDS } from '../config/iap';
import { useIAP } from '../hooks/useIAP';
import { useSubscription } from '../hooks/useSubscription';
import { openTermsOfUse, openPrivacyPolicy } from '../utils/legalLinks';

export default function FoundersMembershipModal() {
  const router = useRouter();
  const theme = useEdenTheme();
  const { isInitialized, purchaseSubscription, canPurchase, status, error: iapError, refreshStatus } = useIAP();
  const { subscription, refetch: refreshSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Check if we should show fallback options
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canPurchase && !isLoading) {
        setShowFallback(true);
      }
    }, 5000); // Show fallback after 5 seconds if IAP isn't ready

    return () => clearTimeout(timer);
  }, [canPurchase, isLoading]);

  // Auto-close modal if subscription becomes active
  useEffect(() => {
    if (subscription?.hasActiveSubscription) {
      console.log('✅ Subscription detected as active, closing paywall');
      // Use a small delay to ensure any pending state updates complete
      const timer = setTimeout(() => {
        try {
          router.replace('/(tabs)/lists');
        } catch (navigationError) {
          console.error('❌ Navigation error:', navigationError);
          // Fallback: try router.back() if replace fails
          router.back();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [subscription?.hasActiveSubscription, router]);

  // Also check subscription status periodically while modal is open
  useEffect(() => {
    if (!subscription?.hasActiveSubscription) {
      const checkInterval = setInterval(() => {
        console.log('🔄 Checking subscription status...');
        refreshSubscription();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(checkInterval);
    }
  }, [subscription?.hasActiveSubscription, refreshSubscription]);

  const handleJoinToday = async () => {
    console.log('🔥 BUTTON PRESSED: Join Today button was clicked!');
    try {
      setIsLoading(true);
      setPurchaseError(null);
      setShowFallback(false);
      
      console.log('🚀 Starting direct purchase for Founders Membership');
      console.log('🔍 IAP Status:', status);
      console.log('🔍 Can Purchase:', canPurchase);
      console.log('🔍 Is Initialized:', isInitialized);
      console.log('🔍 Environment:', __DEV__ ? 'development' : 'production');
      
      // Purchase subscription
      console.log('💳 Attempting purchase...');
      const success = await purchaseSubscription(IAP_PRODUCT_IDS.FOUNDERS_YEARLY!);
      
      if (success) {
        console.log('✅ Purchase successful! User now has Founders Membership');
        
        // Wait a moment for any async updates to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh subscription status
        console.log('🔄 Refreshing subscription status...');
        try {
          await refreshSubscription();
          console.log('✅ Subscription status refreshed');
        } catch (refreshError) {
          console.warn('⚠️ Failed to refresh subscription status:', refreshError);
          // Don't fail the flow if refresh fails
        }
        
        // Navigate back to main app
        console.log('🔄 Navigating to main app...');
        router.replace('/(tabs)/lists');
        
      } else {
        console.log('❌ Purchase returned false');
        setPurchaseError('Purchase was cancelled or failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      // Provide specific error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      
      console.log('🔍 Error details:', {
        message: errorMessage,
        type: typeof error,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      
      if (errorMessage.includes('configuration')) {
        setPurchaseError('Payment system configuration issue. Please contact support.');
        setShowFallback(true);
      } else if (errorMessage.includes('timeout')) {
        setPurchaseError('Connection timeout. Please check your internet and try again.');
      } else if (errorMessage.includes('cancelled')) {
        setPurchaseError('Purchase was cancelled.');
      } else if (errorMessage.includes('not ready') || errorMessage.includes('not available')) {
        setPurchaseError('Payment system is temporarily unavailable. Please try again later.');
        setShowFallback(true);
      } else {
        setPurchaseError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueForFree = () => {
    console.log('🔥 BUTTON PRESSED: Continue for Free button was clicked!');
    console.log('🔄 Continue for free button pressed');
    try {
      // Navigate to free trial upsell instead of dismissing
      console.log('🔄 Navigating to free trial upsell modal...');
      router.push('/(modals)/free-trial-upsell');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback: just close the modal
      router.back();
    }
  };

  const handleClose = () => {
    console.log('🔥 BUTTON PRESSED: Close button (X) was clicked!');
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          presentation: 'modal',
          headerShown: false,
        }} 
      />
      
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={EDEN_COLORS.TEXT} 
          />
        </TouchableOpacity>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Main content */}
          <View style={styles.mainContent}>
            {/* Header */}
            <View style={styles.header}>
              <Typography variant="h1" style={styles.title}>
                Join our founding membership
              </Typography>
            </View>

            {/* Marketing copy */}
            <View style={styles.copySection}>
              <Text style={[theme.typography.body, styles.copyText]}>
                You've seen what Eden is all about — now we'd love to invite you to become one of our founding members.
              </Text>
              
              <View style={styles.offerSection}>
                <Text style={[theme.typography.body, styles.offerText]}>
                  For <Text style={styles.priceText}>$30/year</Text> you'll get:
                </Text>
              </View>

              {/* Benefits list */}
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.emoji}>🌳</Text>
                  <Text style={[theme.typography.body, styles.benefitText]}>
                    Get unlimited access to reviews, comparisons, and all future features
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Text style={styles.emoji}>👥</Text>
                  <Text style={[theme.typography.body, styles.benefitText]}>
                    Join our first 1,000 founding members and help shape the app's direction
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Text style={styles.emoji}>✍️</Text>
                  <Text style={[theme.typography.body, styles.benefitText]}>
                    Enjoy direct access to the founding team for feature requests and feedback
                  </Text>
                </View>
              </View>

              <Text style={[theme.typography.body, styles.closingText]}>
                Your membership supports ongoing development of the app and allows us to build the best possible experience for golf sickos just like you.
              </Text>

              {/* Subscription Terms */}
              <View style={styles.subscriptionTerms}>
                <Text style={[theme.typography.bodySmall, styles.subscriptionInfo]}>
                  <Text style={styles.bold}>Founders Membership</Text> • $29.99/year • 7-day free trial
                </Text>
                <Text style={[theme.typography.bodySmall, styles.subscriptionInfo]}>
                  Auto-renews annually. Cancel anytime in settings.
                </Text>
                <View style={styles.legalLinks}>
                  <TouchableOpacity onPress={() => openTermsOfUse()}>
                    <Text style={[theme.typography.bodySmall, styles.linkText]}>Terms of Use</Text>
                  </TouchableOpacity>
                  <Text style={[theme.typography.bodySmall, styles.separator]}> • </Text>
                  <TouchableOpacity onPress={() => openPrivacyPolicy()}>
                    <Text style={[theme.typography.bodySmall, styles.linkText]}>Privacy Policy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.buttonSection}>
          {/* Error message */}
          {purchaseError && (
            <Text style={styles.errorText}>{purchaseError}</Text>
          )}
          
          <Button
            label="Join today"
            variant="primary"
            onPress={handleJoinToday}
            fullWidth
            loading={isLoading}
            disabled={isLoading}
            style={styles.primaryButton}
          />
          
          {/* Fallback support button */}
          {showFallback && purchaseError && purchaseError.includes('configuration') && (
            <Button
              label="Contact Support"
              variant="secondary"
              onPress={() => {
                Linking.openURL('mailto:support@golfculture.io?subject=Payment Issue&body=I am experiencing issues with the payment system when trying to purchase the Founders Membership.');
              }}
              fullWidth
              disabled={isLoading}
              style={styles.fallbackButton}
            />
          )}
          
          <Button
            label="Continue for free"
            variant="tertiary"
            onPress={handleContinueForFree}
            fullWidth
            disabled={isLoading}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EDEN_COLORS.BACKGROUND,
  },
  closeButton: {
    position: 'absolute',
    top: 45,
    right: 20,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: EDEN_COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80, // Reduced space for higher close button
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    textAlign: 'left',
    color: EDEN_COLORS.PRIMARY,
  },
  copySection: {
    marginBottom: 20,
  },
  copyText: {
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 24,
    color: EDEN_COLORS.TEXT,
  },
  offerSection: {
    marginBottom: 24,
  },
  offerText: {
    textAlign: 'left',
    lineHeight: 24,
    color: EDEN_COLORS.TEXT,
  },
  priceText: {
    fontWeight: '600',
    color: EDEN_COLORS.PRIMARY,
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    lineHeight: 24,
    color: EDEN_COLORS.TEXT,
  },
  closingText: {
    textAlign: 'left',
    lineHeight: 24,
    color: EDEN_COLORS.TEXT,
  },
  subscriptionTerms: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: EDEN_COLORS.BORDER,
  },
  subscriptionInfo: {
    textAlign: 'center',
    color: EDEN_COLORS.TEXT_SECONDARY,
    marginBottom: 8,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '600',
    color: EDEN_COLORS.TEXT,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  linkText: {
    color: EDEN_COLORS.PRIMARY,
    textDecorationLine: 'underline',
  },
  separator: {
    color: EDEN_COLORS.TEXT_SECONDARY,
  },
  buttonSection: {
    paddingHorizontal: 24,
    paddingBottom: 34, // Safe area bottom padding
    backgroundColor: EDEN_COLORS.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: EDEN_COLORS.BORDER,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    // No additional styling needed
  },
  fallbackButton: {
    marginBottom: 12,
    backgroundColor: EDEN_COLORS.SECONDARY || '#f0f0f0',
  },
  errorText: {
    color: EDEN_COLORS.ERROR,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
}); 