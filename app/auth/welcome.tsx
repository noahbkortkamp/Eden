import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEdenTheme } from '@/app/theme';
import { Ionicons } from '@expo/vector-icons';
import { createStyles } from '@/app/theme/utils';

export default function WelcomeScreen() {
  const theme = useEdenTheme();
  const { height } = useWindowDimensions();
  
  const handleGetStarted = () => {
    console.log('Get started button pressed');
    router.push('/auth/onboarding-signup');
  };
  
  const handleSignIn = () => {
    router.push('/auth/login');
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/eden-globe.png')}
          style={styles.globeImage}
          resizeMode="contain"
        />
        <Image
          source={require('@/assets/images/eden-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[theme.typography.body, styles.subtitle]}>
          Review every course you play, find the hidden gems in your area, and share experiences with your friends
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, theme.components.button.primary]}
          onPress={handleGetStarted}
        >
          <Text style={[theme.typography.button, styles.buttonText]}>Get started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleSignIn}
        >
          <Text style={[theme.typography.buttonSecondary, styles.loginText]}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = createStyles({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  imageContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  globeImage: {
    width: 460,
    height: 460,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: -32,
  },
  logoImage: {
    width: 320,
    height: 90,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  title: {
    textAlign: 'center',
    lineHeight: 50,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    lineHeight: 24,
    fontSize: 18,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 0,
    marginBottom: 40,
    paddingBottom: 40,
  },
  button: {
    width: '70%',
    alignItems: 'center',
    marginBottom: 20,
    height: 56,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 22,
  },
  loginButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 18,
    textAlign: 'center',
  },
  edenTitle: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 0,
  },
}); 