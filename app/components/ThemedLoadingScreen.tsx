import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useEdenTheme } from '../theme';

export interface ThemedLoadingScreenProps {
  message?: string;
}

export function ThemedLoadingScreen({ message }: ThemedLoadingScreenProps = {}) {
  const theme = useEdenTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/eden-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default ThemedLoadingScreen; 