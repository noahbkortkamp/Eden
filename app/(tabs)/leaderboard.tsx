import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useEdenTheme } from '../theme';
import { Heading1, Heading2, BodyText, Card, Icon } from '../components/eden';
import { LeaderboardItem } from '../components/LeaderboardItem';
import { leaderboardService, type LeaderboardUser } from '../services/leaderboardService';
import { LazyTabWrapper } from '../components/LazyTabWrapper';
import { useTabLazyLoadingContext } from '../context/TabLazyLoadingContext';

function LeaderboardScreenContent() {
  const theme = useEdenTheme();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load leaderboard data
  const loadLeaderboard = useCallback(async () => {
    try {
      console.log('🏆 Loading leaderboard data...');
      const [topUsers, qualifyingCount] = await Promise.all([
        leaderboardService.getTopReviewers(),
        leaderboardService.getQualifyingUserCount()
      ]);

      console.log(`📊 Found ${topUsers.length} top users, ${qualifyingCount} total qualifying`);
      setUsers(topUsers);
      setError(null);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
      setUsers([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Render individual leaderboard item
  const renderLeaderboardItem = useCallback(({ item }: { item: LeaderboardUser }) => (
    <LeaderboardItem user={item} />
  ), []);

  // Show "Coming Soon" if no qualifying users or error
  if ((!isLoading && users.length === 0) || error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.comingSoonContent}>
          <Icon name="Trophy" size={80} color={theme.colors.primary} style={styles.icon} />
          <Heading1>Leaderboard</Heading1>
          <Heading2 style={styles.comingSoonText}>Coming Soon!</Heading2>
          <Card variant="default" style={styles.infoCard}>
            <BodyText style={styles.description}>
              {error 
                ? 'Unable to load the leaderboard right now. Please try again later.'
                : 'The leaderboard will appear once users have submitted 10 or more reviews. Be the first to reach 10 reviews and claim the top spot!'
              }
            </BodyText>
          </Card>
        </View>
      </View>
    );
  }

  // Show leaderboard with users
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <BodyText 
          color={theme.colors.textSecondary} 
          style={styles.subtitle}
        >
          Follow the top reviewers on Eden to see their favorite courses and compare rankings.
        </BodyText>
      </View>

      <FlatList
        data={users}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={(_, index) => ({
          length: 60, // Approximate item height (reduced from 80)
          offset: 60 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Coming Soon styles
  comingSoonContent: {
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
  },
  // Leaderboard styles
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  subtitle: {
    lineHeight: 20,
    textAlign: 'left',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for tab bar
  },
});

// Export the lazy-loaded version
export default function LeaderboardScreen() {
  const { isTabActivated } = useTabLazyLoadingContext();
  const tabName = 'leaderboard';
  
  const handleFirstActivation = () => {
    console.log('🚀 Leaderboard tab: First activation - will load leaderboard data');
    // The leaderboard data loading will be triggered by the component mount
  };
  
  return (
    <LazyTabWrapper
      isActive={true} // This tab is controlled by the navigation
      hasBeenActive={isTabActivated(tabName)}
      onFirstActivation={handleFirstActivation}
      tabName="Leaderboard"
    >
      <LeaderboardScreenContent />
    </LazyTabWrapper>
  );
} 