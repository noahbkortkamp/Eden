import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, X, Trophy, Bell, Menu } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { searchGolfCourses, getNearbyCourses, formatCourseData } from '../utils/places';

interface Course {
  id: string;
  name: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  totalRatings: number;
  photos: string[];
  isOpen?: boolean;
  website?: string;
  phone?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<string>('Loading location...');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });

      // Get location name using reverse geocoding
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address) {
        setLocation(`${address.city || 'Unknown City'}, ${address.region || 'Unknown Region'}`);
      } else {
        setLocation('Location found');
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setLocation('Location unavailable');
      setError('Failed to get your location. Please check your location settings.');
    }
  }, []);

  const loadNearbyCourses = useCallback(async () => {
    if (!coordinates) {
      setError('Location is required to find nearby courses');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const nearbyCourses = await getNearbyCourses({
        lat: coordinates.latitude,
        lng: coordinates.longitude,
      });

      setCourses(nearbyCourses.map(formatCourseData));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load courses';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [coordinates]);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (coordinates) {
      loadNearbyCourses();
    }
  }, [coordinates, loadNearbyCourses]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadNearbyCourses();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const searchResults = await searchGolfCourses(searchQuery, coordinates ? {
        lat: coordinates.latitude,
        lng: coordinates.longitude,
      } : undefined);
      
      setCourses(searchResults.map(formatCourseData));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    setLocation('Loading location...');
    setCoordinates(null);
    setError(null);
    getCurrentLocation();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>fairway</Text>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => Alert.alert('Notifications', 'Coming soon!')}>
            <Bell size={24} color="#000" style={styles.icon} />
          </Pressable>
          <Pressable onPress={() => Alert.alert('Menu', 'Coming soon!')}>
            <Menu size={24} color="#000" />
          </Pressable>
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
            returnKeyType="search"
          />
        </View>
        <View style={styles.locationBar}>
          <MapPin size={20} color="#64748b" />
          <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          <Pressable onPress={handleClearLocation}>
            <X size={16} color="#64748b" style={styles.clearIcon} />
          </Pressable>
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
            <Pressable onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={loadNearbyCourses}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => (
                <Pressable 
                  key={course.id} 
                  style={styles.courseItem}
                  onPress={() => router.push(`/review/${course.id}`)}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                    <Text style={styles.courseLocation} numberOfLines={1}>{course.location}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
  },
  retryButton: {
    marginTop: 8,
    padding: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#2563eb',
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
    color: '#64748b',
  },
  clearIcon: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeFilter: {
    backgroundColor: '#eff6ff',
  },
  filterText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  activeFilterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#000',
  },
  seeAll: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#2563eb',
  },
  featuredContainer: {
    gap: 16,
  },
  featuredCard: {
    width: 280,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
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
  },
  featuredTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  courseList: {
    gap: 12,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  courseInfo: {
    flex: 1,
    marginRight: 16,
  },
  courseName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  courseLocation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  ratingBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#2563eb',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});