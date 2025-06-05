import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { edenTheme } from '../theme/edenTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 CRITICAL: Uncaught error in ErrorBoundary:', error);
    console.error('🚨 CRITICAL: Error info:', errorInfo);
    console.error('🚨 CRITICAL: Error stack:', error.stack);
    console.error('🚨 CRITICAL: Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Show alert in production builds for TestFlight debugging
    if (!__DEV__) {
      setTimeout(() => {
        const errorMessage = `🚨 React Error Caught 🚨

Error: ${error.message}

Stack: ${error.stack?.substring(0, 200)}...

Component: ${errorInfo.componentStack?.substring(0, 200)}...

Platform: ${Platform.OS}
Timestamp: ${new Date().toLocaleString()}`;

        console.log('🚨 Showing error boundary alert...');
        Alert.alert(
          '🚨 App Error Detected',
          errorMessage,
          [
            { text: 'Reset App', onPress: () => this.handleReset() },
            { text: 'View Details', onPress: () => console.log('Full error details logged') }
          ]
        );
      }, 100);
    }
  }

  private handleReset = () => {
    console.log('🔄 ErrorBoundary: Resetting error state');
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Static theme since we can't use hooks in class components
      const theme = edenTheme;

      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {this.state.error?.message}
          </Text>
          
          {/* Show more details in production for debugging */}
          {!__DEV__ && this.state.error && (
            <View style={styles.debugContainer}>
              <Text style={[styles.debugTitle, { color: theme.colors.text }]}>Debug Info:</Text>
              <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                Platform: {Platform.OS}
              </Text>
              <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                Time: {new Date().toLocaleString()}
              </Text>
              <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                Stack: {this.state.error.stack?.substring(0, 150)}...
              </Text>
              {this.state.errorInfo && (
                <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
                  Component: {this.state.errorInfo.componentStack?.substring(0, 100)}...
                </Text>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md }]} 
            onPress={this.handleReset}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Try again</Text>
          </TouchableOpacity>
          
          {/* Additional button to show full error details */}
          {!__DEV__ && (
            <TouchableOpacity 
              style={[styles.secondaryButton, { borderColor: theme.colors.primary, borderRadius: theme.borderRadius.md }]} 
              onPress={() => {
                const fullError = `Full Error Details:

Error: ${this.state.error?.message}

Stack: ${this.state.error?.stack}

Component Stack: ${this.state.errorInfo?.componentStack}

Environment Variables:
${Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')).map(k => `${k}: ${process.env[k]?.length || 0} chars`).join('\n')}

Platform: ${Platform.OS}
Timestamp: ${new Date().toISOString()}`;

                Alert.alert('Full Error Details', fullError, [
                  { text: 'Copy to Console', onPress: () => console.log(fullError) },
                  { text: 'OK' }
                ]);
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>View Full Error</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24, // Direct value instead of spacing.lg
  },
  title: {
    fontSize: 20, // Direct value instead of typography.fontSize.xl
    fontWeight: 'bold', // Direct value instead of typography.fontWeight.bold
    marginBottom: 8, // Direct value instead of spacing.sm
  },
  message: {
    fontSize: 16, // Direct value instead of typography.fontSize.md
    textAlign: 'center',
    marginBottom: 24, // Direct value instead of spacing.lg
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    marginBottom: 24,
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: 24, // Direct value instead of spacing.lg
    paddingVertical: 8, // Direct value instead of spacing.sm
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16, // Direct value instead of typography.fontSize.md
    fontWeight: '600', // Direct value instead of typography.fontWeight.semibold
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 