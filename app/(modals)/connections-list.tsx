import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Text, Avatar, Divider, SegmentedButtons, Searchbar } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { User } from '../types';
import Constants from 'expo-constants';
import { fullScreenOptions } from '../config/navigationConfig';

export default function ConnectionsListScreen() {
  const { userId, userName, initialTab = 'followers' } = useLocalSearchParams<{ 
    userId: string, 
    userName: string,
    initialTab?: 'followers' | 'following'
  }>();
  const router = useRouter();
  const theme = useTheme();
  const [connections, setConnections] = useState<User[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    initialTab === 'following' ? 'following' : 'followers'
  );
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      router.back();
      return;
    }

    fetchCounts();
    fetchConnections();
  }, [userId, activeTab]);

  // Filter connections when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConnections(connections);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = connections.filter(
      user => 
        (user.full_name && user.full_name.toLowerCase().includes(query)) || 
        (user.username && user.username.toLowerCase().includes(query))
    );
    setFilteredConnections(filtered);
  }, [searchQuery, connections]);

  const fetchCounts = async () => {
    try {
      const { followers, following } = await getFollowCounts(userId);
      setFollowersCount(followers);
      setFollowingCount(following);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const getFollowCounts = async (userId: string): Promise<{followers: number, following: number}> => {
    const [followersResponse, followingResponse] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
    ]);

    if (followersResponse.error) throw followersResponse.error;
    if (followingResponse.error) throw followingResponse.error;

    return {
      followers: followersResponse.count || 0,
      following: followingResponse.count || 0
    };
  };

  const fetchConnections = async () => {
    setLoading(true);
    setSearchQuery(''); // Reset search when tab changes
    try {
      let data, error;

      if (activeTab === 'followers') {
        // Get all users who follow the current user
        ({ data, error } = await supabase
          .from('follows')
          .select(`
            follower_id,
            users:follower_id (id, full_name, username, avatar_url)
          `)
          .eq('following_id', userId));
        
        if (error) {
          console.error('Error fetching followers:', error);
          return;
        }

        // Transform the data to get just the user objects
        const followersList = data
          .map(item => item.users)
          .filter(user => user !== null) as User[];

        setConnections(followersList);
        setFilteredConnections(followersList);
      } else {
        // Get all users that the current user follows
        ({ data, error } = await supabase
          .from('follows')
          .select(`
            following_id,
            users:following_id (id, full_name, username, avatar_url)
          `)
          .eq('follower_id', userId));
        
        if (error) {
          console.error('Error fetching following:', error);
          return;
        }

        // Transform the data to get just the user objects
        const followingList = data
          .map(item => item.users)
          .filter(user => user !== null) as User[];

        setConnections(followingList);
        setFilteredConnections(followingList);
      }
    } catch (error) {
      console.error(`Error in fetch${activeTab === 'followers' ? 'Followers' : 'Following'}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: User) => {
    router.push({
      pathname: '/user-profile',
      params: { 
        userId: user.id,
        userName: user.full_name || user.username || 'User'
      }
    });
  };

  const getFirstLetter = (name: string | null | undefined): string => {
    if (!name) return 'U';
    return name[0].toUpperCase();
  };

  const handleFindFriends = () => {
    // Navigate to the search screen with members tab selected
    router.replace({
      pathname: '/(tabs)/search',
      params: { tab: 'members' }
    });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      {item.avatar_url ? (
        <Avatar.Image
          size={50}
          source={{ uri: item.avatar_url }}
        />
      ) : (
        <Avatar.Text
          size={50}
          label={getFirstLetter(item.full_name || item.username)}
          color="white"
          style={{ backgroundColor: theme.colors.primary }}
        />
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.full_name || item.username || 'User'}
        </Text>
        {item.username && item.full_name && (
          <Text style={styles.userHandle}>@{item.username}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={fullScreenOptions} />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {userName || 'User'}
            </Text>
          </View>
          
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}
            buttons={[
              {
                value: 'followers',
                label: `${followersCount} Followers`
              },
              {
                value: 'following',
                label: `${followingCount} Following`
              }
            ]}
            style={styles.toggle}
          />
        </View>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={`Search ${activeTab}`}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor={theme.colors.primary}
          />
        </View>

        <TouchableOpacity 
          style={styles.findFriendsContainer}
          onPress={handleFindFriends}
        >
          <View style={styles.findFriendsIcon}>
            <UserPlus size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.findFriendsTextContainer}>
            <Text style={styles.findFriendsText}>Find friends</Text>
          </View>
          <View style={styles.findFriendsArrow}>
            <Text style={{ color: theme.colors.outline }}>›</Text>
          </View>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredConnections.length === 0 ? (
          <View style={styles.centered}>
            {searchQuery.trim() !== '' ? (
              <Text style={{ color: theme.colors.text }}>
                No results found for "{searchQuery}"
              </Text>
            ) : (
              <Text style={{ color: theme.colors.text }}>
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredConnections}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  backButton: {
    padding: 4,
  },
  toggle: {
    backgroundColor: 'transparent',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 25,
    elevation: 0,
    backgroundColor: '#f2f2f2',
  },
  findFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  findFriendsIcon: {
    marginRight: 16,
  },
  findFriendsTextContainer: {
    flex: 1,
  },
  findFriendsText: {
    fontSize: 16,
    fontWeight: '500',
  },
  findFriendsArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userHandle: {
    fontSize: 14,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 