import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity,
  Keyboard,
  Platform
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { edenTheme } from '../theme/edenTheme';
import { UserPlus, Check, Search } from 'lucide-react-native';
import { getSuggestedUsers, searchUsersByName, followUser, unfollowUser, isFollowing } from '../utils/friends';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types/index';
import { supabase } from '../utils/supabase';

export default function FindFriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [followingStatus, setFollowingStatus] = useState<{[key: string]: boolean}>({});
  const [followLoading, setFollowLoading] = useState<{[key: string]: boolean}>({});
  const [isSearching, setIsSearching] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load suggested users on mount
  useEffect(() => {
    const loadSuggestedUsers = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Get users with most reviews
        const suggested = await getSuggestedUsers(user.id, 10);
        console.log('Suggested users loaded:', suggested);
        setUsers(suggested || []);
        
        // Check following status for each user
        if (suggested && suggested.length > 0) {
          const statusPromises = suggested.map(async (suggestedUser) => {
            try {
              const status = await isFollowing(user.id, suggestedUser.id);
              return { userId: suggestedUser.id, isFollowing: status };
            } catch (err) {
              console.error('Error checking following status for user', suggestedUser.id, err);
              return { userId: suggestedUser.id, isFollowing: false };
            }
          });
          
          try {
            const statuses = await Promise.all(statusPromises);
            const statusMap = statuses.reduce((acc, curr) => {
              acc[curr.userId] = curr.isFollowing;
              return acc;
            }, {} as {[key: string]: boolean});
            
            setFollowingStatus(statusMap);
          } catch (error) {
            console.error('Error getting following statuses:', error);
          }
        }
      } catch (error) {
        console.error('Error loading suggested users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSuggestedUsers();
  }, [user]);

  // Handle search input
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchUsersByName(searchQuery);
          console.log('Search results:', results);
          setSearchResults(results || []);
          
          // Check following status for each result
          if (user && results && results.length > 0) {
            try {
              const statusPromises = results.map(async (result) => {
                try {
                  const status = await isFollowing(user.id, result.id);
                  return { userId: result.id, isFollowing: status };
                } catch (err) {
                  console.error('Error checking following status for user', result.id, err);
                  return { userId: result.id, isFollowing: false };
                }
              });
              
              const statuses = await Promise.all(statusPromises);
              const statusMap = statuses.reduce((acc, curr) => {
                acc[curr.userId] = curr.isFollowing;
                return acc;
              }, {} as {[key: string]: boolean});
              
              setFollowingStatus(prev => ({...prev, ...statusMap}));
            } catch (error) {
              console.error('Error getting following statuses for search results:', error);
            }
          }
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
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
      } else {
        await followUser(user.id, userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleContinue = async () => {
    try {
      console.log('Marking onboarding as complete...');
      
      // Mark onboarding as complete before navigating to first review
      await supabase.auth.updateUser({
        data: { 
          onboardingComplete: true
        }
      });
      
      console.log('Onboarding marked complete, navigating to first review');
      router.replace('/auth/first-review');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Navigate anyway to avoid blocking the user
      router.replace('/auth/first-review');
    }
  };

  // Dismiss keyboard when tapping outside search box
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderUserItem = ({ item }: { item: UserType }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>
            {item.full_name || item.username}
          </Text>
          <Text style={styles.reviewCount}>
            {item.review_count === 1 
              ? '1 course reviewed'
              : `${item.review_count || 0} courses reviewed`}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          followingStatus[item.id]
            ? { backgroundColor: edenTheme.colors.success + '20', borderColor: edenTheme.colors.success }
            : { backgroundColor: edenTheme.colors.primary + '20', borderColor: edenTheme.colors.primary }
        ]}
        onPress={() => handleFollow(item.id)}
        disabled={followLoading[item.id]}
      >
        {followLoading[item.id] ? (
          <ActivityIndicator size="small" color={edenTheme.colors.primary} />
        ) : followingStatus[item.id] ? (
          <Check size={16} color={edenTheme.colors.success} />
        ) : (
          <UserPlus size={16} color={edenTheme.colors.primary} />
        )}
        <Text
          style={[
            styles.followButtonText,
            {
              color: followingStatus[item.id]
                ? edenTheme.colors.success
                : edenTheme.colors.primary
            }
          ]}
        >
          {followingStatus[item.id] ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const displayUsers = searchQuery.trim() ? searchResults : users;

  // Layout debugging function
  const onLayout = (e: any) => {
    console.log('List container layout:', e.nativeEvent.layout);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} onStartShouldSetResponder={() => {
        dismissKeyboard();
        return false; // Allow event to propagate to children
      }}>
        <Text style={styles.header}>Build your weekly foursome</Text>
        <Text style={styles.subheader}>Add friends on Eden to see their reviews and compare rankings</Text>

        <View style={styles.searchBar}>
          <Search size={20} color={edenTheme.colors.textSecondary} />
          <TextInput
            placeholder="Search by name..."
            style={styles.searchInput}
            placeholderTextColor={edenTheme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={dismissKeyboard}
          />
        </View>

        <View 
          style={styles.listContainer} 
          onLayout={onLayout}
        >
          {loading || isSearching ? (
            <ActivityIndicator style={styles.loader} color={edenTheme.colors.primary} size="large" />
          ) : displayUsers.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={displayUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.usersList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEnabled={true}
              onScrollToIndexFailed={(info) => {
                console.log('Scroll to index failed:', info);
              }}
              style={{ width: '100%' }}
              onScroll={(e) => {
                console.log('Scrolling:', e.nativeEvent.contentOffset.y);
              }}
              bounces={true}
              alwaysBounceVertical={true}
              initialNumToRender={4}
              removeClippedSubviews={false}
            />
          ) : searchQuery.trim() ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No users found matching '{searchQuery}'
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No suggested users available at this time
              </Text>
              <Text style={styles.emptySubtext}>
                You can invite friends to join Eden after creating your account
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.continueButton}
            buttonColor={edenTheme.colors.primary}
            labelStyle={styles.continueButtonText}
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: edenTheme.spacing.xl,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: edenTheme.colors.text,
    fontFamily: edenTheme.typography.h1.fontFamily,
    textAlign: 'left',
    marginBottom: 16,
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  subheader: {
    fontSize: 18,
    color: edenTheme.colors.text,
    textAlign: 'left',
    marginBottom: 24,
    alignSelf: 'flex-start',
    lineHeight: 26,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: edenTheme.colors.border,
    backgroundColor: edenTheme.colors.surface,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: edenTheme.colors.text,
  },
  listContainer: {
    flex: 1,
    marginBottom: 16,
    width: '100%',
    minHeight: 200, // Ensure minimum height
    backgroundColor: edenTheme.colors.background,
    zIndex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    paddingBottom: 16,
    width: '100%',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: edenTheme.colors.border,
    backgroundColor: edenTheme.colors.surface,
    width: '100%',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: edenTheme.colors.text,
  },
  reviewCount: {
    fontSize: 14,
    color: edenTheme.colors.textSecondary,
    marginTop: 4,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 16,
    zIndex: 2,
  },
  continueButton: {
    width: '100%',
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: Platform.OS === 'ios' ? 0 : edenTheme.spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: edenTheme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: edenTheme.colors.textSecondary,
    fontSize: 14,
    opacity: 0.8,
  },
}); 