import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Typography } from './eden';
import { TestingHelpers } from '../utils/testingHelpers';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

/**
 * Development-only testing panel for IAP flows
 * Only shows in development builds
 */
export const TestingPanel: React.FC = () => {
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();

  // Only show in development
  if (!__DEV__ || !user) {
    return null;
  }

  const handleSetReviewCount = (count: number) => {
    Alert.alert(
      'Set Review Count',
      `Set review count to ${count}? This will trigger paywall testing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            await TestingHelpers.setReviewCount(user.id, count);
            Alert.alert('Success', `Review count set to ${count}`);
          }
        }
      ]
    );
  };

  const handleResetSubscription = () => {
    Alert.alert(
      'Reset Subscription',
      'Reset subscription status to test paywall again?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          onPress: async () => {
            await TestingHelpers.resetSubscriptionStatus(user.id);
            await refetch(); // Refresh subscription status
            Alert.alert('Success', 'Subscription reset - user is now free tier');
          }
        }
      ]
    );
  };

  const handleGrantPremium = () => {
    Alert.alert(
      'Grant Premium',
      'Grant 30 days of premium access for testing?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Grant', 
          onPress: async () => {
            await TestingHelpers.grantTestPremiumAccess(user.id, 30);
            await refetch(); // Refresh subscription status
            Alert.alert('Success', 'Premium access granted for 30 days');
          }
        }
      ]
    );
  };

  const handleLogStatus = async () => {
    await TestingHelpers.logTestingStatus(user.id);
    Alert.alert('Testing Status', 'Check console for detailed status');
  };

  return (
    <View style={styles.container}>
      <Typography variant="h3" style={styles.title}>
        🧪 Testing Panel
      </Typography>
      
      <Typography variant="body" style={styles.subtitle}>
        Development only - test IAP without charges
      </Typography>

      <View style={styles.section}>
        <Typography variant="h4" style={styles.sectionTitle}>
          Current Status
        </Typography>
        <Typography variant="caption" style={styles.status}>
          Subscription: {subscription?.subscriptionStatus || 'inactive'}
        </Typography>
        <Typography variant="caption" style={styles.status}>
          Has Access: {subscription?.hasActiveSubscription ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="caption" style={styles.status}>
          Trial: {subscription?.isTrialPeriod ? 'Yes' : 'No'}
        </Typography>
      </View>

      <View style={styles.section}>
        <Typography variant="h4" style={styles.sectionTitle}>
          Paywall Testing
        </Typography>
        <Button
          label="Set 5 Reviews (trigger on next)"
          variant="secondary"
          onPress={() => handleSetReviewCount(5)}
          style={styles.button}
        />
        <Button
          label="Set 6 Reviews (trigger paywall)"
          variant="secondary"
          onPress={() => handleSetReviewCount(6)}
          style={styles.button}
        />
        <Button
          label="Reset Reviews"
          variant="tertiary"
          onPress={() => handleSetReviewCount(0)}
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Typography variant="h4" style={styles.sectionTitle}>
          Subscription Testing
        </Typography>
        <Button
          label="Reset Subscription"
          variant="secondary"
          onPress={handleResetSubscription}
          style={styles.button}
        />
        <Button
          label="Grant Premium Access"
          variant="primary"
          onPress={handleGrantPremium}
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Button
          label="Log Testing Status"
          variant="tertiary"
          onPress={handleLogStatus}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderStyle: 'dashed',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  status: {
    marginBottom: 4,
    color: '#666',
  },
  button: {
    marginBottom: 8,
  },
}); 