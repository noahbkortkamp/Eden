import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, X, Trophy, Bell, Menu, Users, TrendingUp } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getNearbyCoursesWithinRadius } from '../utils/courses';
import { Database } from '../utils/database.types';
import { FriendsReviewsFeed } from '../components/FriendsReviewsFeed';

type Course = Database['public']['Tables']['courses']['Row'];

// Define tab types for the feed
type FeedTab = 'friends' | 'trending';

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [location, setLocation] = useState<string>('Boston, MA');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('friends');

  useEffect(() => {
    loadNearbyCourses();
  }, []);

  const loadNearbyCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({});
      const nearbyCourses = await getNearbyCoursesWithinRadius(
        location.coords.latitude,
        location.coords.longitude,
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

  const handleFindFriendsPress = () => {
    // Navigate to the search tab with members tab active
    router.push('/(tabs)/search');
    // We'll need to update the search tab to check for this parameter
    setTimeout(() => {
      // The timeout ensures the navigation completes first
      router.setParams({ tab: 'members' });
    }, 100);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>fairway</Text>
        <View style={styles.headerIcons}>
          <Bell size={24} color="#000" style={styles.icon} />
          <Menu size={24} color="#000" />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable 
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Search size={20} color="#64748b" />
          <Text 
            style={[styles.searchInput, { color: '#64748b' }]}
          >
            Search courses...
          </Text>
        </Pressable>
        <View style={styles.locationBar}>
          <MapPin size={20} color="#64748b" />
          <Text style={styles.locationText}>{location}</Text>
          <X size={16} color="#64748b" style={styles.clearIcon} />
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScrollView}>
        <Pressable 
          style={[
            styles.filterTab, 
            activeTab === 'friends' && styles.activeTab
          ]}
          onPress={() => handleTabChange('friends')}
        >
          <Text 
            style={activeTab === 'friends' ? styles.activeTabText : styles.tabText}
          >
            Friends
          </Text>
        </Pressable>

        <Pressable 
          style={[
            styles.filterTab, 
            activeTab === 'trending' && styles.activeTab
          ]}
          onPress={() => handleTabChange('trending')}
        >
          <Text 
            style={activeTab === 'trending' ? styles.activeTabText : styles.tabText}
          >
            Trending
          </Text>
        </Pressable>
      </ScrollView>

      {/* Main Content */}
      {activeTab === 'friends' ? (
        // Friends Reviews Feed
        <View style={styles.friendsFeedContainer}>
          <FriendsReviewsFeed onFindFriendsPress={handleFindFriendsPress} />
        </View>
      ) : (
        // Trending feed - Coming Soon placeholder
        <View style={styles.comingSoonContainer}>
          <TrendingUp size={60} color="#CBD5E1" />
          <Text style={styles.comingSoonTitle}>Trending Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            We're working on bringing you the most popular courses in your area.
            Check back later!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  clearIcon: {
    padding: 4,
  },
  filterScrollView: {
    backgroundColor: '#fff',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 5,
    maxHeight: 32,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 16,
    height: 30,
  },
  filterTab: {
    paddingVertical: 3,
    marginHorizontal: 4,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066ff',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  activeTabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0066ff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563eb',
  },
  featuredContainer: {
    paddingLeft: 16,
    gap: 12,
  },
  featuredCard: {
    width: 280,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    height: '50%',
    justifyContent: 'flex-end',
  },
  featuredTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#e2e8f0',
  },
  courseList: {
    paddingHorizontal: 16,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  ratingBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563eb',
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#ef4444',
    paddingHorizontal: 16,
  },
  friendsFeedContainer: {
    flex: 1,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  comingSoonContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
});