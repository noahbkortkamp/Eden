import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Typography } from '../components/eden';
import { useEdenTheme } from '../theme';
import { EDEN_COLORS } from '../theme/edenColors';
import { useAuth } from '../context/AuthContext';
import { TestingHelpers } from '../utils/testingHelpers';
import { IAP_CONFIG } from '../config/iap';
import { format } from 'date-fns';

// Import new Supabase-based subscription service
import { 
  subscriptionStatusService, 
  SubscriptionStatus 
} from '../services/subscriptionStatusService';

export default function SubscriptionManagementModal() {
  const router = useRouter();
  const theme = useEdenTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Load subscription status using new Supabase-based service
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        console.log('🔄 Subscription Management: Loading subscription status from Supabase...');
        
        // Get subscription status from Supabase (our source of truth)
        const status = await subscriptionStatusService.getSubscriptionStatus(user.id);
        setSubscriptionStatus(status);
        
        console.log('✅ Subscription Management: Supabase status loaded:', status);
      } catch (error) {
        console.error('❌ Subscription Management: Error loading Supabase status:', error);
        // Set default status on error
        setSubscriptionStatus({
          hasActiveSubscription: false,
          subscriptionStatus: 'inactive',
          isTrialPeriod: false,
          lastVerified: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();
  }, [user?.id]);

  const handleClose = () => {
    router.back();
  };

  const handleManageSubscription = async () => {
    // Open Apple's subscription management page
    console.log('🔗 Subscription Management: Opening Apple subscription management...');
    
    const success = await subscriptionStatusService.openAppleSubscriptionManagement();
    
    if (!success) {
      Alert.alert(
        'Manage Subscription',
        'Please go to your device\'s Settings > Apple ID > Subscriptions to manage your subscription.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRenewSubscription = () => {
    router.push('/(modals)/expired-membership');
  };

  const handleRefreshStatus = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Manual status refresh triggered for management page');
      const status = await subscriptionStatusService.refreshSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      
      Alert.alert(
        'Status Updated',
        `Your subscription status has been refreshed: ${status.subscriptionStatus.toUpperCase()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Manual status refresh error:', error);
      Alert.alert(
        'Refresh Failed',
        'Could not refresh subscription status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!subscriptionStatus) return EDEN_COLORS.TEXT_SECONDARY;
    
    switch (subscriptionStatus.subscriptionStatus) {
      case 'active':
      case 'trial':
        return EDEN_COLORS.SUCCESS;
      case 'grace_period':
        return '#F59E0B'; // Warning yellow
      case 'expired':
      case 'inactive':
        return EDEN_COLORS.ERROR;
      case 'unknown':
        return '#F59E0B'; // Warning yellow
      default:
        return EDEN_COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusText = () => {
    if (!subscriptionStatus) return 'Loading...';
    
    switch (subscriptionStatus.subscriptionStatus) {
      case 'active':
        return subscriptionStatus.isTrialPeriod ? 'Active (Trial)' : 'Active';
      case 'trial':
        return 'Free Trial';
      case 'expired':
        return 'Expired';
      case 'grace_period':
        return 'Grace Period';
      case 'inactive':
        return 'Inactive';
      case 'unknown':
        return 'Unable to Verify';
      default:
        return 'Unknown';
    }
  };

  const getStatusMessage = () => {
    if (!subscriptionStatus) return null;
    
    switch (subscriptionStatus.subscriptionStatus) {
      case 'active':
        return subscriptionStatus.isTrialPeriod 
          ? 'You are in your free trial period with full access to premium features.'
          : 'You have full access to all premium features.';
      case 'trial':
        return 'You are in your free trial period with full access to premium features.';
      case 'expired':
        return 'Your subscription has expired. Renew to regain access to premium features.';
      case 'grace_period':
        return 'Payment issue detected. You still have access, but please update your payment method.';
      case 'inactive':
        return 'Your subscription is not active. You are limited to 15 course reviews.';
      case 'unknown':
        return 'Unable to verify subscription status. Premium features may be limited.';
      default:
        return null;
    }
  };

  // Derive helper values from subscription status for management page display
  const hasPremiumAccess = subscriptionStatus?.hasActiveSubscription || false;
  const isExpiringSoon = subscriptionStatus?.expirationDate 
    ? new Date(subscriptionStatus.expirationDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
    : false;

  // Development testing helpers
  const handleTestExpired = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await TestingHelpers.setExpiredSubscription(user.id, 7);
      // Refresh status after test change
      const status = await subscriptionStatusService.refreshSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      Alert.alert('Success', 'Subscription set to expired for testing');
    } catch (error) {
      console.error('Error setting expired subscription:', error);
      Alert.alert('Error', 'Failed to set expired subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestActive = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await TestingHelpers.grantTestPremiumAccess(user.id, 30);
      // Refresh status after test change
      const status = await subscriptionStatusService.refreshSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      Alert.alert('Success', 'Premium access granted for testing');
    } catch (error) {
      console.error('Error granting premium access:', error);
      Alert.alert('Error', 'Failed to grant premium access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestReset = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await TestingHelpers.resetSubscriptionStatus(user.id);
      // Refresh status after test change
      const status = await subscriptionStatusService.refreshSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
      Alert.alert('Success', 'Subscription reset to inactive');
    } catch (error) {
      console.error('Error resetting subscription:', error);
      Alert.alert('Error', 'Failed to reset subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Subscription',
          presentation: 'modal',
          gestureEnabled: true,
          headerShown: false,
        }}
      />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2" style={styles.title}>
            Subscription
          </Typography>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={EDEN_COLORS.TEXT} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Current Status Section */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Current Status
            </Typography>
            
            <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
              <View style={styles.statusHeader}>
                <Typography variant="body" style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Typography>
                {hasPremiumAccess && (
                  <View style={[styles.activeBadge, { backgroundColor: getStatusColor() }]}>
                    <Text style={styles.activeBadgeText}>PREMIUM</Text>
                  </View>
                )}
              </View>
              
              {subscriptionStatus?.productId && (
                <Typography variant="bodySmall" style={styles.productText}>
                  Product: {subscriptionStatus.productId}
                </Typography>
              )}

              {subscriptionStatus?.expirationDate && (
                <Typography variant="bodySmall" style={styles.productText}>
                  {subscriptionStatus.subscriptionStatus === 'active' || subscriptionStatus.subscriptionStatus === 'trial' 
                    ? `Expires: ${format(new Date(subscriptionStatus.expirationDate), 'MMM d, yyyy')}`
                    : `Expired: ${format(new Date(subscriptionStatus.expirationDate), 'MMM d, yyyy')}`
                  }
                </Typography>
              )}

              <Typography variant="bodySmall" style={styles.statusMessage}>
                {getStatusMessage()}
              </Typography>

              <Typography variant="bodySmall" style={styles.sourceNote}>
                ✅ Status loaded from database{subscriptionStatus?.lastVerified ? ` • Last updated: ${format(new Date(subscriptionStatus.lastVerified), 'MMM d, h:mm a')}` : ''}
              </Typography>
              
              {/* Debug Information - Show when status is unknown or in development */}
              {(subscriptionStatus?.subscriptionStatus === 'unknown' || __DEV__) && subscriptionStatus?.debugInfo && (
                <View style={styles.debugSection}>
                  <Typography variant="bodySmall" style={styles.debugTitle}>
                    Debug Information:
                  </Typography>
                  <Typography variant="bodySmall" style={styles.debugText}>
                    Environment: {subscriptionStatus.debugInfo.environment}
                  </Typography>
                  <Typography variant="bodySmall" style={styles.debugText}>
                    Total Purchases: {subscriptionStatus.debugInfo.totalPurchases}
                  </Typography>
                  <Typography variant="bodySmall" style={styles.debugText}>
                    Product IDs Checked: {subscriptionStatus.debugInfo.productIdsChecked.join(', ')}
                  </Typography>
                  {subscriptionStatus.debugInfo.availablePurchases.length > 0 && (
                    <Typography variant="bodySmall" style={styles.debugText}>
                      Found Products: {subscriptionStatus.debugInfo.availablePurchases.map(p => p.productId).join(', ')}
                    </Typography>
                  )}
                  {subscriptionStatus.debugInfo.errorMessage && (
                    <Typography variant="bodySmall" style={styles.debugError}>
                      Error: {subscriptionStatus.debugInfo.errorMessage}
                    </Typography>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Membership Features
            </Typography>
            
            <View style={styles.featuresCard}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: hasPremiumAccess ? EDEN_COLORS.SUCCESS : EDEN_COLORS.ERROR }]}>
                  <Ionicons 
                    name={hasPremiumAccess ? "checkmark" : "close"} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <Typography variant="body" style={styles.featureText}>
                  Unlimited course reviews
                </Typography>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: hasPremiumAccess ? EDEN_COLORS.SUCCESS : EDEN_COLORS.ERROR }]}>
                  <Ionicons 
                    name={hasPremiumAccess ? "checkmark" : "close"} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <Typography variant="body" style={styles.featureText}>
                  Access to all course rankings
                </Typography>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: hasPremiumAccess ? EDEN_COLORS.SUCCESS : EDEN_COLORS.ERROR }]}>
                  <Ionicons 
                    name={hasPremiumAccess ? "checkmark" : "close"} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <Typography variant="body" style={styles.featureText}>
                  Course scoring & recommendations
                </Typography>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.section}>
            {/* Status Refresh Button - Always Available */}
            <Button
              label="Refresh Status"
              variant="tertiary"
              onPress={handleRefreshStatus}
              loading={isLoading}
              fullWidth
              style={styles.actionButton}
            />

            {subscriptionStatus?.subscriptionStatus === 'inactive' ? (
              <>
                <Button
                  label="Get Premium Membership"
                  variant="primary"
                  onPress={() => router.push('/(modals)/founders-membership')}
                  fullWidth
                  style={styles.actionButton}
                />
                <Button
                  label="Manage Subscription"
                  variant="secondary"
                  onPress={handleManageSubscription}
                  loading={isLoading}
                  fullWidth
                  style={styles.actionButton}
                />
              </>
            ) : hasPremiumAccess ? (
              <Button
                label="Manage Subscription"
                variant="secondary"
                onPress={handleManageSubscription}
                loading={isLoading}
                fullWidth
                style={styles.actionButton}
              />
            ) : (
              <Button
                label="Get Premium Access"
                variant="primary"
                onPress={() => router.push('/(modals)/founders-membership')}
                fullWidth
                style={styles.actionButton}
              />
            )}
          </View>

          {/* Development Testing Section (only show in dev) */}
          {__DEV__ && (
            <View style={styles.section}>
              <Typography variant="h3" style={styles.sectionTitle}>
                Development Testing
              </Typography>
              
              <View style={styles.testingCard}>
                <Typography variant="bodySmall" style={styles.testingNote}>
                  Use these buttons to test different subscription states
                </Typography>
                
                <Button
                  label="Test Expired State"
                  variant="secondary"
                  onPress={handleTestExpired}
                  fullWidth
                  loading={isLoading}
                  style={styles.testButton}
                />
                
                <Button
                  label="Test Active State"
                  variant="primary"
                  onPress={handleTestActive}
                  fullWidth
                  loading={isLoading}
                  style={styles.testButton}
                />
                
                <Button
                  label="Reset to Inactive"
                  variant="tertiary"
                  onPress={handleTestReset}
                  fullWidth
                  loading={isLoading}
                  style={styles.testButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EDEN_COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: EDEN_COLORS.BORDER,
  },
  title: {
    color: EDEN_COLORS.TEXT,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: EDEN_COLORS.TEXT,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: EDEN_COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: EDEN_COLORS.BORDER,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 18,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  productText: {
    color: EDEN_COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    fontSize: 12,
  },
  statusMessage: {
    color: EDEN_COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  sourceNote: {
    color: EDEN_COLORS.SUCCESS,
    fontSize: 12,
    fontStyle: 'italic',
  },
  featuresCard: {
    backgroundColor: EDEN_COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: EDEN_COLORS.BORDER,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    color: EDEN_COLORS.TEXT,
  },
  actionButton: {
    marginBottom: 12,
  },
  testingCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  testingNote: {
    color: '#856404',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  testButton: {
    marginBottom: 8,
  },
  debugSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  debugTitle: {
    color: '#856404',
    fontWeight: '600',
    marginBottom: 8,
  },
  debugText: {
    color: EDEN_COLORS.TEXT,
    marginBottom: 4,
  },
  debugError: {
    color: EDEN_COLORS.ERROR,
    marginBottom: 4,
  },
}); 