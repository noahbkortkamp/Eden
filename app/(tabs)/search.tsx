import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react-native';
import { mockCourses } from '../api/mockData';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = mockCourses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
        >
          <SlidersHorizontal size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.results}>
        {filteredCourses.map(course => (
          <TouchableOpacity
            key={course.course_id}
            style={[styles.courseItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => handleCoursePress(course.course_id)}
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
                ⭐️ {course.average_rating.toFixed(1)}
              </Text>
              <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
                📝 {course.total_reviews} reviews
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
}); 