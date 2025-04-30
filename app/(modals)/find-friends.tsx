import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Avatar, Divider, Searchbar, Button } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';

export default function FindFriendsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Find Friends</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search for users"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
          onSubmitEditing={() => {
            setLoading(true);
            // Simulate a search process
            setTimeout(() => setLoading(false), 1000);
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.infoText}>
            Search for users by name or username
          </Text>
          <Text style={[styles.infoText, styles.smallText]}>
            This feature will be fully implemented soon!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    borderRadius: 25,
    elevation: 0,
    backgroundColor: '#f2f2f2',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
  smallText: {
    fontSize: 14,
    color: '#666',
  }
}); 