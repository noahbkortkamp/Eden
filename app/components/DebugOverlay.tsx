import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface DebugInfo {
  timestamp: string;
  platform: string;
  devMode: boolean;
  nodeEnv: string;
  supabaseUrl: boolean;
  supabaseKey: boolean;
  apiUrl: boolean;
  envKeys: string[];
}

export const DebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(!__DEV__); // Show by default in production
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    // Collect debug information
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      platform: require('react-native').Platform.OS,
      devMode: __DEV__,
      nodeEnv: process.env.NODE_ENV || 'unknown',
      supabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiUrl: !!process.env.EXPO_PUBLIC_API_URL,
      envKeys: Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC'))
    };
    
    setDebugInfo(info);
    console.log('🐛 Debug overlay info:', info);
  }, []);

  if (!isVisible || !debugInfo) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.toggleText}>🐛</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.title}>🐛 Debug Info</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment</Text>
          <Text style={styles.item}>Platform: {debugInfo.platform}</Text>
          <Text style={styles.item}>Dev Mode: {debugInfo.devMode ? 'Yes' : 'No'}</Text>
          <Text style={styles.item}>NODE_ENV: {debugInfo.nodeEnv}</Text>
          <Text style={styles.item}>Timestamp: {debugInfo.timestamp}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment Variables</Text>
          <Text style={[styles.item, debugInfo.supabaseUrl ? styles.success : styles.error]}>
            Supabase URL: {debugInfo.supabaseUrl ? '✓' : '✗'}
          </Text>
          <Text style={[styles.item, debugInfo.supabaseKey ? styles.success : styles.error]}>
            Supabase Key: {debugInfo.supabaseKey ? '✓' : '✗'}
          </Text>
          <Text style={[styles.item, debugInfo.apiUrl ? styles.success : styles.error]}>
            API URL: {debugInfo.apiUrl ? '✓' : '✗'}
          </Text>
          <Text style={styles.item}>
            EXPO_PUBLIC Keys: {debugInfo.envKeys.length}
          </Text>
          {debugInfo.envKeys.map(key => (
            <Text key={key} style={styles.subItem}>• {key}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    zIndex: 9999,
  },
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  toggleText: {
    fontSize: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'white',
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  item: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  subItem: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 10,
    marginBottom: 2,
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#f44336',
  },
}); 