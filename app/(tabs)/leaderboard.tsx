import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function LeaderboardScreen() {
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  // Mock data - would come from your backend
  const rankings = [
    {
      id: '1',
      name: 'John Smith',
      username: '@johnsmith',
      rank: 1,
      handicap: 2,
      roundsPlayed: 24,
      averageScore: 72,
      avatar: null,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      username: '@sarahj',
      rank: 2,
      handicap: 3,
      roundsPlayed: 20,
      averageScore: 74,
      avatar: null,
    },
    {
      id: '3',
      name: 'Mike Wilson',
      username: '@mikew',
      rank: 3,
      handicap: 4,
      roundsPlayed: 18,
      averageScore: 75,
      avatar: null,
    },
  ];

  const renderRankChange = (rank: number) => {
    if (rank === 1) return <Trophy size={20} color="#fbbf24" />;
    if (rank === 2) return <Medal size={20} color="#94a3b8" />;
    if (rank === 3) return <Medal size={20} color="#b45309" />;
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.timeFrameContainer}>
          <TouchableOpacity 
            style={[styles.timeFrameButton, timeFrame === 'weekly' && styles.activeTimeFrame]}
            onPress={() => setTimeFrame('weekly')}>
            <Text style={[styles.timeFrameText, timeFrame === 'weekly' && styles.activeTimeFrameText]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeFrameButton, timeFrame === 'monthly' && styles.activeTimeFrame]}
            onPress={() => setTimeFrame('monthly')}>
            <Text style={[styles.timeFrameText, timeFrame === 'monthly' && styles.activeTimeFrameText]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeFrameButton, timeFrame === 'allTime' && styles.activeTimeFrame]}
            onPress={() => setTimeFrame('allTime')}>
            <Text style={[styles.timeFrameText, timeFrame === 'allTime' && styles.activeTimeFrameText]}>All Time</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {rankings.map((player) => (
          <TouchableOpacity key={player.id} style={styles.playerCard}>
            <View style={styles.rankContainer}>
              <Text style={styles.rank}>{player.rank}</Text>
              {renderRankChange(player.rank)}
            </View>
            <View style={styles.playerInfo}>
              <View style={styles.avatarContainer}>
                {player.avatar ? (
                  <Image source={{ uri: player.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <Text style={styles.avatarText}>
                      {player.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerUsername}>{player.username}</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Handicap</Text>
                <Text style={styles.statValue}>{player.handicap}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Rounds</Text>
                <Text style={styles.statValue}>{player.roundsPlayed}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Avg Score</Text>
                <Text style={styles.statValue}>{player.averageScore}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  timeFrameContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTimeFrame: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeFrameText: {
    fontSize: 14,
    color: '#64748b',
  },
  activeTimeFrameText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  playerUsername: {
    fontSize: 14,
    color: '#64748b',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
}); 