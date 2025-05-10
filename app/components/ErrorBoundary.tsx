import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { edenTheme } from '../theme/edenTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
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
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md }]} 
            onPress={this.handleReset}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Try again</Text>
          </TouchableOpacity>
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
  button: {
    paddingHorizontal: 24, // Direct value instead of spacing.lg
    paddingVertical: 8, // Direct value instead of spacing.sm
  },
  buttonText: {
    fontSize: 16, // Direct value instead of typography.fontSize.md
    fontWeight: '600', // Direct value instead of typography.fontWeight.semibold
  },
}); 