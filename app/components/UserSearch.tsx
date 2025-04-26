import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';
import { Search, UserPlus, Check, X } from 'lucide-react-native';
import { searchUsersByName, followUser, unfollowUser, isFollowing } from '../utils/friends';
import { User } from '../types/index';
import { useAuth } from '../context/AuthContext';

interface UserSearchProps {
  onClose?: () => void;
  onFollowChanged?: (userId: string, isFollowing: boolean) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onClose, onFollowChanged }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingStatus, setFollowingStatus] = useState<{[key: string]: boolean}>({});
  const [followLoading, setFollowLoading] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        try {
          const results = await searchUsersByName(searchQuery);
          setSearchResults(results);
          
          // Check following status for each result
          if (user && results.length > 0) {
            const statusPromises = results.map(async (result) => {
              const status = await isFollowing(user.id, result.id);
              return { userId: result.id, isFollowing: status };
            });
            
            const statuses = await Promise.all(statusPromises);
            const statusMap = statuses.reduce((acc, curr) => {
              acc[curr.userId] = curr.isFollowing;
              return acc;
            }, {} as {[key: string]: boolean});
            
            setFollowingStatus(statusMap);
          }
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user]);

  const handleFollow = async (userId: string) => {
    if (!user) return;
    
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const wasFollowing = followingStatus[userId];
      if (wasFollowing) {
        await unfollowUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
        // Notify parent component about unfollow action
        onFollowChanged?.(userId, false);
      } else {
        await followUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
        // Notify parent component about follow action
        onFollowChanged?.(userId, true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.userItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
            <Text style={styles.avatarText}>
              {item.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <Text style={[styles.userName, { color: theme.colors.text }]}>
          {item.full_name}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          followingStatus[item.id]
            ? { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success }
            : { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
        ]}
        onPress={() => handleFollow(item.id)}
        disabled={followLoading[item.id]}
      >
        {followLoading[item.id] ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : followingStatus[item.id] ? (
          <Check size={16} color={theme.colors.success} />
        ) : (
          <UserPlus size={16} color={theme.colors.primary} />
        )}
        <Text
          style={[
            styles.followButtonText,
            {
              color: followingStatus[item.id]
                ? theme.colors.success
                : theme.colors.primary
            }
          ]}
        >
          {followingStatus[item.id] ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Find Friends</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput
          placeholder="Search by name..."
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        />
      ) : searchQuery.trim() ? (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No users found matching '{searchQuery}'
        </Text>
      ) : (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Search for friends by name
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  loader: {
    marginTop: 24,
  },
  resultsList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  }
}); 