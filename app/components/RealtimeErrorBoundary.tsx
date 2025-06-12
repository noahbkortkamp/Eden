import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorBoundaryId: string;
  retryCount: number;
}

/**
 * Enhanced Error Boundary specifically designed for real-time components
 * Handles subscription errors, network issues, and provides automatic recovery
 */
export class RealtimeErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private maxRetries = 3;
  private autoResetDelay = 5000; // 5 seconds

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorBoundaryId: `boundary_${Date.now()}_${Math.random()}`,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error details for debugging
    console.error('🚨 RealtimeErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundaryId: this.state.errorBoundaryId,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-retry for subscription-related errors
    if (this.isSubscriptionError(error) && this.state.retryCount < this.maxRetries) {
      console.log(`🔄 Auto-retrying subscription error (attempt ${this.state.retryCount + 1}/${this.maxRetries})`);
      this.scheduleAutoReset();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private isSubscriptionError(error: Error): boolean {
    const subscriptionKeywords = [
      'subscribe multiple times',
      'channel instance',
      'subscription',
      'realtime',
      'supabase',
    ];
    
    return subscriptionKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private scheduleAutoReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      console.log('🔄 Auto-resetting error boundary after subscription error');
      this.handleRetry();
    }, this.autoResetDelay);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
      errorBoundaryId: `boundary_${Date.now()}_${Math.random()}`, // Force component remount
    }));

    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  };

  private handleManualRetry = () => {
    console.log('🔄 Manual retry triggered by user');
    this.handleRetry();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Determine if this is a subscription error
      const isSubscriptionError = this.isSubscriptionError(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;

      // Default error UI
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#FF6B6B" style={styles.errorIcon} />
          
          <Text style={styles.errorTitle}>
            {isSubscriptionError ? 'Connection Issue' : 'Something went wrong'}
          </Text>
          
          <Text style={styles.errorMessage}>
            {isSubscriptionError 
              ? 'We\'re having trouble with real-time updates. Retrying automatically...'
              : this.state.error.message
            }
          </Text>

          {isSubscriptionError && canRetry && (
            <Text style={styles.retryInfo}>
              Retry {this.state.retryCount + 1} of {this.maxRetries}
            </Text>
          )}

          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={this.handleManualRetry}
            disabled={!canRetry}
          >
            <RefreshCw size={16} color="#FFFFFF" style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>
              {canRetry ? 'Retry Now' : 'Max Retries Reached'}
            </Text>
          </TouchableOpacity>

          {isSubscriptionError && (
            <Text style={styles.technicalNote}>
              The app will continue to work, but real-time updates may be delayed.
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryInfo: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  technicalNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 