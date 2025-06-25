import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Typography } from '../components/eden';
import { useEdenTheme } from '../theme';
import { EDEN_COLORS } from '../theme/edenColors';
import { IAP_PRODUCT_IDS } from '../config/iap';
import { useIAP } from '../hooks/useIAP';

export default function FreeTrialUpsellModal() {
  const router = useRouter();
  const theme = useEdenTheme();
  const { isInitialized, purchaseSubscription } = useIAP();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handleStartFreeTrial = async () => {
    try {
      setIsLoading(true);
      setPurchaseError(null);
      
      if (!isInitialized) {
        setPurchaseError('Payment system is initializing. Please wait a moment and try again.');
        return;
      }
      
      console.log('🚀 Starting free trial purchase for Founders Membership');
      
      // Purchase subscription WITH introductory offer (7-day free trial)
      const success = await purchaseSubscription(IAP_PRODUCT_IDS.FOUNDERS_YEARLY!);
      
      if (success) {
        console.log('✅ Free trial started! User now has 7-day trial access');
        // Navigate back to main app
        router.replace('/(tabs)/lists');
      } else {
        setPurchaseError('Trial setup was cancelled or failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Free trial setup failed:', error);
      setPurchaseError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotGolfSicko = () => {
    // Dismiss all modals and return to search screen with free limitations
    router.replace('/(tabs)/lists');
  };

  const handleClose = () => {
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
                Are you sure?
              </Typography>
              <Text style={[theme.typography.body, styles.subtitle]}>
                Free users will be capped at 15 courses and won't have access to all our premium features.
              </Text>
              <Text style={[theme.typography.body, styles.trialOffer]}>
                We're offering a seven day free trial so you can get the full Eden experience before joining the club.
              </Text>
            </View>

            {/* Trial Timeline */}
            <View style={styles.timelineSection}>
              {/* Timeline Items */}
              <View style={styles.timelineContainer}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={[theme.typography.body, styles.timelineLabel]}>Today</Text>
                    <Text style={[theme.typography.bodySmall, styles.timelineDescription]}>
                      Unlock unlimited reviews, comparisons, premium features, and all future updates.
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={[theme.typography.body, styles.timelineLabel]}>In 6 days</Text>
                    <Text style={[theme.typography.bodySmall, styles.timelineDescription]}>
                      Get a reminder about when your trial will end.
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, styles.timelineDotFinal]} />
                  <View style={styles.timelineContent}>
                    <Text style={[theme.typography.body, styles.timelineLabel]}>In 7 days</Text>
                    <Text style={[theme.typography.bodySmall, styles.timelineDescription]}>
                      You'll be charged the lifetime membership amount. Cancel anytime before.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Pricing Section */}
            <View style={styles.pricingSection}>
              <Text style={[theme.typography.h3, styles.pricingTitle]}>
                Free 7-Day Trial
              </Text>
              <Text style={[theme.typography.body, styles.pricingSubtitle]}>
                $30 lifetime membership after trial
              </Text>
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
            label="Start my free trial"
            variant="primary"
            onPress={handleStartFreeTrial}
            fullWidth
            loading={isLoading}
            disabled={isLoading}
            style={styles.primaryButton}
          />
          
          <Button
            label="I'm not a true golf sicko"
            variant="tertiary"
            onPress={handleNotGolfSicko}
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
    marginBottom: 24,
  },
  title: {
    textAlign: 'left',
    color: EDEN_COLORS.PRIMARY,
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 16,
    color: EDEN_COLORS.TEXT,
  },
  trialOffer: {
    textAlign: 'left',
    lineHeight: 24,
    color: EDEN_COLORS.TEXT,
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: EDEN_COLORS.PRIMARY,
    marginRight: 16,
    marginTop: 4,
  },
  timelineDotFinal: {
    backgroundColor: EDEN_COLORS.TEXT_SECONDARY,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontWeight: '600',
    color: EDEN_COLORS.TEXT,
    marginBottom: 4,
  },
  timelineDescription: {
    lineHeight: 20,
    color: EDEN_COLORS.TEXT_SECONDARY,
  },
  pricingSection: {
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: EDEN_COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EDEN_COLORS.BORDER,
  },
  pricingTitle: {
    color: EDEN_COLORS.PRIMARY,
    marginBottom: 8,
  },
  pricingSubtitle: {
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
  errorText: {
    color: EDEN_COLORS.ERROR,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
}); 