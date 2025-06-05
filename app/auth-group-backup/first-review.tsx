import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { reviewService } from '../services/reviewService';
import { userService } from '../services/userService';
import { Search, MapPin } from 'lucide-react-native';
import { edenTheme } from '../theme/edenTheme';
import { debounce } from 'lodash'; // You may need to install lodash if not already installed

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
  const [topCourses, setTopCourses] = useState<Course[]>([]);
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
        
        // Load initial courses in alphabetical order
        await loadInitialCourses();
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    checkUserStatus();
  }, [user]);

  // Load initial popular courses to show in the default view
  const loadInitialCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, location, type')
        .order('name', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      
      setTopCourses(data || []);
    } catch (error) {
      console.error('Error loading initial courses:', error);
    }
  };

  // Debounced search function to search as user types
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Search courses in the database
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, location, type')
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching for courses:', error);
    } finally {
      setLoading(false);
    }
  }, 300); // 300ms debounce delay
  
  // Handle text input change
  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
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

  // Render a single course item
  const renderCourseItem = (course: Course) => (
    <TouchableOpacity
      key={course.id}
      style={styles.courseItem}
      onPress={() => handleCourseSelect(course)}
    >
      <View style={styles.courseInfo}>
        <Text style={styles.courseName}>{course.name}</Text>
        <View style={styles.locationContainer}>
          <MapPin size={14} color={edenTheme.colors.textSecondary} />
          <Text style={styles.courseLocation}>{course.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={edenTheme.colors.primary} />
        <Text style={styles.loadingText}>
          Setting up your experience...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.fixedHeaderContainer}>
          <View style={styles.header}>
            <Text 
              variant="headlineMedium" 
              style={[styles.title, { 
                fontFamily: edenTheme.typography.h2.fontFamily, 
                fontWeight: edenTheme.typography.h2.fontWeight as any
              }]}
            >
              Leave Your First Review
            </Text>
            
            <Text style={[styles.subtitle, { color: edenTheme.colors.textSecondary }]}>
              Help other golfers by sharing your experience at a course you've played.
            </Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              label="Search for a course you've played"
              value={searchQuery}
              onChangeText={handleSearchInputChange}
              style={styles.searchInput}
              left={<TextInput.Icon icon={() => <Search size={20} color={edenTheme.colors.textSecondary} />} />}
              mode="outlined"
              outlineColor={edenTheme.components.input.default.borderColor}
              activeOutlineColor={edenTheme.colors.primary}
              theme={{
                colors: {
                  background: edenTheme.components.input.default.backgroundColor,
                  text: edenTheme.colors.text,
                }
              }}
              autoFocus={false}
            />
          </View>
        </View>
        
        <View style={styles.scrollableContent}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={edenTheme.colors.primary} />
            </View>
          )}
          
          {!loading && (
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchQuery.trim() !== '' && searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>
                    {searchResults.length} {searchResults.length === 1 ? 'Course' : 'Courses'} Found
                  </Text>
                  
                  {searchResults.map(course => renderCourseItem(course))}
                </View>
              )}
              
              {searchQuery.trim() !== '' && searchResults.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No courses found. Try a different search term.
                  </Text>
                </View>
              )}
              
              {searchQuery.trim() === '' && topCourses.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>
                    Popular Courses
                  </Text>
                  
                  {topCourses.map(course => renderCourseItem(course))}
                </View>
              )}
              
              <View style={styles.skipContainer}>
                <TouchableOpacity onPress={handleSkip}>
                  <Text style={[styles.skipText, { color: edenTheme.colors.textSecondary }]}>
                    Skip for now
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  fixedHeaderContainer: {
    paddingHorizontal: edenTheme.spacing.lg,
    paddingTop: edenTheme.spacing.xl,
    backgroundColor: edenTheme.colors.background,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    paddingBottom: edenTheme.spacing.md,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: edenTheme.spacing.lg,
    paddingTop: edenTheme.spacing.sm,
    paddingBottom: edenTheme.spacing.xl * 2,
  },
  header: {
    marginBottom: edenTheme.spacing.xl,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: edenTheme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  searchContainer: {
    marginBottom: edenTheme.spacing.lg,
  },
  searchInput: {
    marginBottom: edenTheme.spacing.sm,
    backgroundColor: edenTheme.components.input.default.backgroundColor,
    borderRadius: edenTheme.borderRadius.sm,
  },
  loadingContainer: {
    padding: edenTheme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: edenTheme.spacing.md,
    color: edenTheme.colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: edenTheme.spacing.sm,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: edenTheme.spacing.sm,
    color: edenTheme.colors.text,
  },
  courseItem: {
    padding: edenTheme.spacing.md,
    backgroundColor: edenTheme.colors.surface,
    borderRadius: edenTheme.borderRadius.md,
    marginBottom: edenTheme.spacing.sm,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: edenTheme.colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
    fontSize: 14,
    marginLeft: 4,
    color: edenTheme.colors.textSecondary,
  },
  emptyContainer: {
    padding: edenTheme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: edenTheme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  skipContainer: {
    marginTop: edenTheme.spacing.xl,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
}); 