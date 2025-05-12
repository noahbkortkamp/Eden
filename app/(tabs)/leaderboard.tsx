import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useEdenTheme } from '../theme';
import { Heading1, Heading2, BodyText, Card, Icon } from '../components/eden';

export default function LeaderboardScreen() {
  const theme = useEdenTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon name="Trophy" size={80} color={theme.colors.primary} style={styles.icon} />
        <Heading1>Leaderboard</Heading1>
        <Heading2 style={styles.comingSoonText}>Coming Soon!</Heading2>
        <Card variant="default" style={styles.infoCard}>
          <BodyText style={styles.description}>
            We're working hard to bring you the leaderboard feature in a future update.
            Stay tuned for rankings, stats, and friendly competition!
          </BodyText>
        </Card>
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
  comingSoonText: {
    marginVertical: 16,
  },
  infoCard: {
    width: '100%',
    maxWidth: 400,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  }
}); 