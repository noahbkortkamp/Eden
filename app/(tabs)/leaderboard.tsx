import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

export default function LeaderboardScreen() {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Trophy size={80} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Leaderboard</Text>
        <Text style={[styles.comingSoonText, { color: theme.colors.textSecondary }]}>
          Coming Soon!
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          We're working hard to bring you the leaderboard feature in a future update.
          Stay tuned for rankings, stats, and friendly competition!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  }
}); 