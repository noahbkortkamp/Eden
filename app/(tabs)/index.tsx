import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, X, Trophy, Bell, Menu } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { searchCourses, getNearbyCoursesWithinRadius } from '../utils/courses';
import { Database } from '../utils/database.types';

type Course = Database['public']['Tables']['courses']['Row'];

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<string>('Boston, MA');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadNearbyCourses();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const searchResults = await searchCourses(searchQuery);
      setCourses(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
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
        <View style={styles.searchBar}>
          <Search size={20} color="#64748b" />
          <TextInput 
            placeholder="Search courses..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
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
        contentContainerStyle={styles.filterContainer}>
        <Pressable style={[styles.filterPill, styles.activeFilter]}>
          <Trophy size={16} color="#2563eb" />
          <Text style={styles.activeFilterText}>Top Rated</Text>
        </Pressable>
        <Pressable style={styles.filterPill}>
          <Text style={styles.filterText}>Trending</Text>
        </Pressable>
        <Pressable style={styles.filterPill}>
          <Text style={styles.filterText}>Friend Recs</Text>
        </Pressable>
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Featured Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Courses</Text>
            <Text style={styles.seeAll}>See All</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContainer}>
            <Pressable style={styles.featuredCard}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=3270&auto=format&fit=crop' }}
                style={styles.featuredImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}>
                <Text style={styles.featuredTitle}>Top 10 Public Courses</Text>
                <Text style={styles.featuredSubtitle}>You've played 3 of 10</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.featuredCard}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1600740288397-83cae0357539?q=80&w=3270&auto=format&fit=crop' }}
                style={styles.featuredImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}>
                <Text style={styles.featuredTitle}>Best Value Courses</Text>
                <Text style={styles.featuredSubtitle}>Under $60 green fees</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>

        {/* Course List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Courses</Text>
          {loading ? (
            <ActivityIndicator style={styles.loader} color="#2563eb" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => (
                <Pressable 
                  key={course.id} 
                  style={styles.courseItem}
                  onPress={() => router.push({
                    pathname: '/(modals)/course-details',
                    params: { courseId: course.id }
                  })}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseLocation}>{course.location}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{(course.rating ?? 0).toFixed(1)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  logo: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    marginRight: 8,
  },
  searchContainer: {
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  clearIcon: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    gap: 6,
  },
  activeFilter: {
    backgroundColor: '#eff6ff',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  activeFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563eb',
  },
  featuredContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  featuredSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#e2e8f0',
    marginTop: 4,
  },
  courseList: {
    paddingHorizontal: 16,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#16a34a',
  },
  loader: {
    marginTop: 20,
    alignSelf: 'center',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
});