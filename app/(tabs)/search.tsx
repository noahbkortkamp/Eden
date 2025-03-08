import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { searchCourses } from '../utils/courses';
import { useDebouncedCallback } from 'use-debounce';
import type { Course } from '../types';

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search to prevent too many API calls
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      setCourses([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await searchCourses(query);
      setCourses(results);
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

  return (
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
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
        >
          <SlidersHorizontal size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.results}>
        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        ) : courses.length > 0 ? (
          courses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={[styles.courseItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleCoursePress(course.id)}
            >
              <Text style={[styles.courseName, { color: theme.colors.text }]}>
                {course.name}
              </Text>
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
          ))
        ) : searchQuery ? (
          <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
            No courses found
          </Text>
        ) : null}
      </ScrollView>
    </View>
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
  results: {
    flex: 1,
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
}); 