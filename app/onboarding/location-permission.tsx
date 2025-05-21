import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Text as RNText } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { edenTheme } from '../theme/edenTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LocationPermissionScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAllow = async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // You can store the permission status or location here if needed
      // Proceed to first review flow in the signup process
      router.replace('/(auth)/first-review');
    } catch (err: any) {
      setError('Failed to request location permission');
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    router.replace('/(auth)/first-review'); // Skip to first review even if location is denied
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaterialCommunityIcons 
          name="flag-outline" 
          size={120} 
          color={edenTheme.colors.primary} 
          style={styles.icon}
        />
        <Text style={styles.header}>Find and review every course in your area</Text>
        <Text style={styles.subheader}>Select "Allow" to share your location. This will allow Eden to do the following:</Text>
        <View style={styles.bullets}>
          <RNText style={styles.bullet}>• Show top-rated courses nearby</RNText>
          <RNText style={styles.bullet}>• Suggest hidden gems around you</RNText>
          <RNText style={styles.bullet}>• Help you track where you've played</RNText>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleAllow}
            loading={loading}
            style={styles.allowButton}
            buttonColor={edenTheme.colors.primary}
            labelStyle={styles.allowButtonText}
          >
            Allow
          </Button>
          <TouchableOpacity onPress={handleNotNow} style={styles.notNowButton} disabled={loading}>
            <Text style={styles.notNowText}>Not now</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: edenTheme.colors.error, marginTop: 8 }}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: edenTheme.spacing.xl,
    paddingTop: 60,
    paddingBottom: 32,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 50,
    marginTop: 30,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: edenTheme.colors.text,
    fontFamily: edenTheme.typography.h1.fontFamily,
    textAlign: 'left',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  subheader: {
    fontSize: 18,
    color: edenTheme.colors.text,
    textAlign: 'left',
    marginBottom: 16,
    alignSelf: 'flex-start',
    lineHeight: 26,
  },
  bullets: {
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  bullet: {
    fontSize: 18,
    color: edenTheme.colors.textSecondary,
    marginBottom: 12,
    textAlign: 'left',
    lineHeight: 26,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  allowButton: {
    width: '100%',
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  allowButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  notNowButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notNowText: {
    fontSize: 18,
    color: edenTheme.colors.primary,
    fontWeight: 'bold',
  },
}); 