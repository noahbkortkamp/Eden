import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { ArrowLeft, UserPlus, Search } from 'lucide-react-native';
import { User } from '../types';
import Constants from 'expo-constants';
import { fullScreenOptions } from '../config/navigationConfig';
import { useEdenTheme } from '../theme';
import { Avatar } from '../components/eden/Avatar';
import { Heading2, Heading3, BodyText, SmallText } from '../components/eden/Typography';
import { Button } from '../components/eden/Button';
import { Input } from '../components/eden/Input';
import { Divider } from '../components/eden/Divider';

export default function ConnectionsListScreen() {
  const { userId, userName, initialTab = 'followers' } = useLocalSearchParams<{ 
    userId: string, 
    userName: string,
    initialTab?: 'followers' | 'following'
  }>();
  const router = useRouter();
  const theme = useEdenTheme();
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
      <Avatar 
        size="medium"
        source={item.avatar_url ? { uri: item.avatar_url } : undefined}
        fallbackText={getFirstLetter(item.full_name || item.username)}
      />
      <View style={styles.userInfo}>
        <BodyText bold>{item.full_name || item.username || 'User'}</BodyText>
        {item.username && item.full_name && (
          <SmallText color={theme.colors.textSecondary}>@{item.username}</SmallText>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={fullScreenOptions} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Heading2>{userName || 'User'}</Heading2>
          </View>
          
          <View style={[styles.tabContainer, { borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                styles.leftTabButton,
                { backgroundColor: theme.colors.background },
                activeTab === 'followers' && { backgroundColor: theme.colors.primaryFocused + '30' }
              ]}
              onPress={() => setActiveTab('followers')}
            >
              <BodyText style={styles.tabText}>
                {followersCount} Followers
              </BodyText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                styles.rightTabButton,
                { backgroundColor: theme.colors.background },
                activeTab === 'following' && { backgroundColor: theme.colors.primaryFocused + '30' }
              ]}
              onPress={() => setActiveTab('following')}
            >
              <BodyText style={styles.tabText}>
                {followingCount} Following
              </BodyText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Input
            placeholder={`Search ${activeTab}`}
            onChangeText={setSearchQuery}
            value={searchQuery}
            startIcon={<Search size={20} color={theme.colors.textSecondary} />}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity 
          style={[styles.findFriendsContainer, { borderColor: theme.colors.border }]}
          onPress={handleFindFriends}
        >
          <UserPlus size={24} color={theme.colors.primary} style={styles.findFriendsIcon} />
          <View style={styles.findFriendsTextContainer}>
            <BodyText bold>Find friends</BodyText>
          </View>
          <SmallText color={theme.colors.textSecondary} style={styles.findFriendsArrow}>›</SmallText>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredConnections.length === 0 ? (
          <View style={styles.centered}>
            {searchQuery.trim() !== '' ? (
              <BodyText>No results found for "{searchQuery}"</BodyText>
            ) : (
              <BodyText>
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </BodyText>
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
  },
  header: {
    padding: 16,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    width: '100%',
  },
  findFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  findFriendsIcon: {
    marginRight: 16,
  },
  findFriendsTextContainer: {
    flex: 1,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftTabButton: {
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
  },
  rightTabButton: {
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
  },
  tabText: {
    textAlign: 'center',
  },
}); 