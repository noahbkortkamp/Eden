import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Search, Trophy, Bell, Menu, Users, TrendingUp } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getNearbyCoursesWithinRadius } from '../utils/courses';
import { Database } from '../utils/database.types';
import { FriendsReviewsFeed, FriendsReviewsFeedRef } from '../components/FriendsReviewsFeed';
import { UserSearch } from '../components/UserSearch';
import { useTheme, useEdenTheme } from '../theme/ThemeProvider';
import EDEN_COLORS from '../theme/edenColors';

type Course = Database['public']['Tables']['courses']['Row'];

// Define tab types for the feed
type FeedTab = 'friends' | 'trending';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('friends');
  const [showFindFriends, setShowFindFriends] = useState(false);
  
  // Fix the ref type to match FriendsReviewsFeedRef
  const friendsFeedRef = useRef<FriendsReviewsFeedRef>(null);

  // Get the Eden theme from context - this is crucial for system-wide consistency
  const edenTheme = useEdenTheme();

  useEffect(() => {
    loadNearbyCourses();
    
    // Check if we were redirected with parameters that should change the active tab
    if (params.tab === 'members') {
      setShowFindFriends(true);
    }
  }, [params]);

  const loadNearbyCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const nearbyCourses = await getNearbyCoursesWithinRadius(
        0, // Assuming default location
        0, // Assuming default location
        50 // 50 mile radius
      );

      setCourses(nearbyCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
  };

  const handleFindFriendsPress = useCallback(() => {
    // Instead of navigating, show the find friends modal
    setShowFindFriends(true);
  }, []);
  
  // Add a function to handle follows/unfollows
  const handleFollowChanged = (userId: string, isFollowing: boolean) => {
    console.log(`User ${isFollowing ? 'followed' : 'unfollowed'} ${userId}, refreshing feed`);
    // If the user followed someone, refresh the friends feed
    if (isFollowing && activeTab === 'friends') {
      // Use a timeout to let the follow action complete first
      setTimeout(() => {
        // The ref is now correctly typed so handleRefresh is guaranteed to exist
        if (friendsFeedRef.current) {
          friendsFeedRef.current.handleRefresh();
        }
      }, 300);
    }
  };

  const navigateToDebug = () => {
    router.push('/(modals)/debug');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Eden</Text>
        <View style={styles.headerIcons}>
          <Bell size={26} color={EDEN_COLORS.TEXT} />
          <Menu size={30} color={EDEN_COLORS.TEXT} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable 
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Search size={18} color={EDEN_COLORS.TEXT_SECONDARY} />
          <Text 
            style={[styles.searchInput]}
          >
            Search courses...
          </Text>
        </Pressable>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabNavContent}
        >
          <Pressable 
            style={[
              styles.tab, 
              activeTab === 'friends' && styles.activeTab
            ]}
            onPress={() => handleTabChange('friends')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'friends' && styles.activeTabText
              ]}
            >
              Friends
            </Text>
          </Pressable>

          <Pressable 
            style={[
              styles.tab, 
              activeTab === 'trending' && styles.activeTab
            ]}
            onPress={() => handleTabChange('trending')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'trending' && styles.activeTabText
              ]}
            >
              Trending
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Feed Content */}
      {activeTab === 'friends' ? (
        <View style={styles.feedContainer}>
          <FriendsReviewsFeed 
            ref={friendsFeedRef}
            onFindFriendsPress={handleFindFriendsPress} 
          />
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <TrendingUp size={60} color={EDEN_COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyStateTitle}>Trending Coming Soon</Text>
          <Text style={styles.emptyStateText}>
            We're working on bringing you the most popular courses in your area.
            Check back later!
          </Text>
        </View>
      )}
      
      {/* Find Friends Modal */}
      <Modal
        visible={showFindFriends}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFindFriends(false)}
      >
        <UserSearch 
          onClose={() => setShowFindFriends(false)} 
          onFollowChanged={handleFollowChanged}
        />
      </Modal>

      {/* Debug Button - We'll keep this but style it to match the new design system */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={navigateToDebug}
      >
        <Text style={styles.debugButtonText}>Debug DB</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EDEN_COLORS.BACKGROUND, // Creamy background for main app
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: EDEN_COLORS.BACKGROUND, // Use creamy background for header too
  },
  logo: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: EDEN_COLORS.PRIMARY,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  icon: {
    marginRight: 0,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: EDEN_COLORS.BACKGROUND,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EDEN_COLORS.SECONDARY_BACKGROUND,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: EDEN_COLORS.TEXT_SECONDARY,
  },
  tabNavContainer: {
    backgroundColor: EDEN_COLORS.BACKGROUND, // Use creamy background for tabs container
    borderBottomWidth: 1,
    borderBottomColor: EDEN_COLORS.BORDER,
  },
  tabNavContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 30,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    position: 'relative',
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: EDEN_COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: EDEN_COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    fontFamily: 'Inter-SemiBold',
    color: EDEN_COLORS.PRIMARY,
    fontSize: 18,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: EDEN_COLORS.BACKGROUND,
  },
  emptyStateContainer: {
    flex: 1,
    backgroundColor: EDEN_COLORS.SECONDARY_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: EDEN_COLORS.PRIMARY,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: EDEN_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: EDEN_COLORS.PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  debugButtonText: {
    color: EDEN_COLORS.BACKGROUND,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
});