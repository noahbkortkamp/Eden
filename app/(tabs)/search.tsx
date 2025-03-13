import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
  X as XIcon,
  CheckCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { searchCourses, getAllCourses } from '../utils/courses';
import { useDebouncedCallback } from 'use-debounce';
import type { Course } from '../types';
import { useAuth } from '../context/AuthContext';
import { getReviewsForUser } from '../utils/reviews';

// Enhanced Course type with search relevance score
interface EnhancedCourse extends Omit<Course, 'type'> {
  type: string;  // Override the type to be more flexible
  relevanceScore?: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<EnhancedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());

  const loadReviewedCourses = async () => {
    if (!user) return;
    try {
      const reviews = await getReviewsForUser(user.id);
      setReviewedCourseIds(new Set(reviews.map(review => review.course_id)));
    } catch (err) {
      console.error('Failed to load reviewed courses:', err);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const allCourses = await getAllCourses();
      setCourses(allCourses as EnhancedCourse[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Load courses and reviews when component mounts
  useEffect(() => {
    loadCourses();
    loadReviewedCourses();
  }, [user]);

  // Debounce the search to prevent too many API calls
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      loadCourses();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get raw search results with scores (we'll keep the smart search but not display stars)
      const results = await searchCourses(query);
      
      // Set courses with their relevance scores (used for sorting)
      if (Array.isArray(results)) {
        if (results.length > 0 && 'relevanceScore' in (results[0] || {})) {
          setCourses(results as EnhancedCourse[]);
        } else {
          const enhancedResults = results.map((course, index) => ({
            ...course,
            relevanceScore: Math.max(100 - (index * 5), 10),
          })) as EnhancedCourse[];
          setCourses(enhancedResults);
        }
      } else {
        setCourses(results as EnhancedCourse[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, 300); // Wait 300ms after the user stops typing before searching

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  const handleCoursePress = (courseId: string) => {
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId }
    });
  };

  const handleCancelPress = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    Keyboard.dismiss();
    loadCourses();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Search Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
            <SearchIcon size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search courses..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')}>
                <XIcon size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
            {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />}
          </View>
          {isSearchFocused ? (
            <TouchableOpacity onPress={handleCancelPress}>
              <Text style={[styles.cancelButton, { color: theme.colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
            >
              <SlidersHorizontal size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <ScrollView 
          style={styles.results}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : courses.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {searchQuery ? 'Search Results' : 'All Courses'}
              </Text>
              {courses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.courseItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleCoursePress(course.id)}
                >
                  <View style={styles.courseHeader}>
                    <View style={styles.courseHeaderLeft}>
                      <Text style={[styles.courseName, { color: theme.colors.text }]}>
                        {course.name}
                      </Text>
                    </View>
                    {reviewedCourseIds.has(course.id) && (
                      <CheckCircle size={20} color={theme.colors.primary} />
                    )}
                  </View>
                  <View style={styles.locationContainer}>
                    <MapPin size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
                      {course.location}
                    </Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
                      Par {course.par}
                    </Text>
                    <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
                      {course.yardage} yards
                    </Text>
                    <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
                      {course.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : searchQuery ? (
            <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
              No courses found
            </Text>
          ) : (
            <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
              Loading courses...
            </Text>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  loader: {
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cancelButton: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  results: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  courseItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    marginLeft: 4,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    fontSize: 14,
  },
  errorText: {
    padding: 16,
    textAlign: 'center',
  },
  noResults: {
    padding: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  courseHeaderLeft: {
    flex: 1,
  },
}); 