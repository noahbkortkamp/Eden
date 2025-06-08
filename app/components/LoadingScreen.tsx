import React from 'react';
import { View, StyleSheet, Image, Text, ActivityIndicator } from 'react-native';

// Eden design system colors
const EDEN_COLORS = {
  background: '#F8F5EC', // Eden cream background
  primary: '#234D2C', // Eden green
  text: '#666',
};

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps = {}) {
  console.log('⏳ LoadingScreen: Rendering loading screen...');
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/eden-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          onLoad={() => console.log('✅ LoadingScreen: Logo loaded successfully')}
          onError={(error) => console.error('❌ LoadingScreen: Logo failed to load:', error.nativeEvent.error)}
        />
        <ActivityIndicator 
          size="large" 
          color={EDEN_COLORS.primary} 
          style={styles.spinner}
        />
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EDEN_COLORS.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  spinner: {
    marginTop: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: EDEN_COLORS.text,
    textAlign: 'center',
  },
});

export default LoadingScreen; 