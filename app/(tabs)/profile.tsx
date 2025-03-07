import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Settings, LogOut } from 'lucide-react-native';
import { DefaultAvatar } from '../components/DefaultAvatar';

export default function ProfileScreen() {
  // This would come from your auth context/state
  const profile = {
    name: 'John Doe',
    username: '@johndoe',
    handicap: 12,
    location: 'Boston, MA',
    roundsPlayed: 24,
    favoriteCoursesCount: 8,
    followersCount: 156,
    followingCount: 142,
    avatar_url: null,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Settings size={24} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <LogOut size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileInfo}>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <DefaultAvatar size={120} />
        )}
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.location}>{profile.location}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.handicap}</Text>
          <Text style={styles.statLabel}>Handicap</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.roundsPlayed}</Text>
          <Text style={styles.statLabel}>Rounds</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.favoriteCoursesCount}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>

      <View style={styles.socialStats}>
        <TouchableOpacity style={styles.socialStatItem}>
          <Text style={styles.socialStatValue}>{profile.followersCount}</Text>
          <Text style={styles.socialStatLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialStatItem}>
          <Text style={styles.socialStatValue}>{profile.followingCount}</Text>
          <Text style={styles.socialStatLabel}>Following</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#64748b',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  socialStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
  },
  socialStatItem: {
    alignItems: 'center',
  },
  socialStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  socialStatLabel: {
    fontSize: 14,
    color: '#64748b',
  },
}); 