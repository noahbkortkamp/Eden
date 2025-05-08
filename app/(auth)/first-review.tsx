import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { reviewService } from '../services/reviewService';
import { userService } from '../services/userService';
import { Search, MapPin } from 'lucide-react-native';

// Course type definition
type Course = {
  id: string;
  name: string;
  location: string;
  type?: string;
};

export default function FirstReviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [hasUserReview, setHasUserReview] = useState(false);

  // Check if user already has reviews or has been marked as having completed first review
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      
      try {
        setInitialLoading(true);
        console.log('🔍 Checking user first-review status');
        
        // Check if user has any reviews
        const count = await reviewService.getUserReviewCount(user.id);
        const hasReviews = count > 0;
        setHasUserReview(hasReviews);
        
        console.log(`🔍 User has ${count} reviews`);
        
        // Check if user metadata indicates they've completed first review
        const hasCompletedFirstReview = await userService.hasCompletedFirstReview(user.id);
        console.log(`🔍 User first review completion status from metadata: ${hasCompletedFirstReview}`);
        
        // If user has reviews or has been marked as completing first review, skip this screen
        if (hasReviews || hasCompletedFirstReview) {
          console.log('🔄 User already has reviews or completed first review, redirecting to main app');
          router.replace('/(tabs)');
          return;
        }
        
        console.log('✅ User needs to complete first review, showing prompt screen');
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    checkUserStatus();
  }, [user]);

  // Search for courses based on user input
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      
      // Search courses in the database
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, location, type')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching for courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a course to review
  const handleCourseSelect = (course: Course) => {
    router.push({
      pathname: '/(modals)/review',
      params: { courseId: course.id }
    });
  };

  // Skip the review and go to main app
  const handleSkip = async () => {
    router.replace('/(tabs)');
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#245E2C" />
        <Text style={styles.loadingText}>
          Setting up your experience...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Leave Your First Review
          </Text>
          
          <Text style={styles.subtitle}>
            Help other golfers by sharing your experience at a course you've played.
          </Text>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            label="Search for a course you've played"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            onSubmitEditing={handleSearch}
            left={<TextInput.Icon icon={() => <Search size={20} color="#555" />} />}
            mode="outlined"
            outlineColor="#ddd"
            activeOutlineColor="#245E2C"
          />
          
          <Button 
            mode="contained" 
            onPress={handleSearch}
            style={styles.searchButton}
            buttonColor="#245E2C"
            loading={loading}
            disabled={loading}
          >
            Search
          </Button>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#245E2C" />
          </View>
        )}
        
        {!loading && searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {searchResults.length} {searchResults.length === 1 ? 'Course' : 'Courses'} Found
            </Text>
            
            {searchResults.map(course => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseItem}
                onPress={() => handleCourseSelect(course)}
              >
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <View style={styles.locationContainer}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.courseLocation}>{course.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {!loading && searchQuery && searchResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No courses found. Try a different search term.
            </Text>
          </View>
        )}
        
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchButton: {
    borderRadius: 8,
    paddingVertical: 6,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  courseItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  skipContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'underline',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 