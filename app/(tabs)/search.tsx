import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Search,
  MapPin,
  Heart,
  TrendingUp,
  Users,
  X,
  Plus,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useSearch } from '../context/SearchContext';
import { GolfCourse, User } from '../types';
import { SearchFiltersComponent } from '../components/SearchFilters';

// This would come from your API/backend
const SAMPLE_COURSES = [
  {
    id: '1',
    name: 'The Country Club',
    location: 'Brookline, Boston, MA',
  },
  {
    id: '2',
    name: 'Franklin Park Golf Course',
    location: 'Dorchester, Boston, MA',
  },
  {
    id: '3',
    name: 'George Wright Golf Course',
    location: 'Hyde Park, Boston, MA',
  },
];

export default function SearchScreen() {
  const [activeTab, setActiveTab] = useState<'courses' | 'members'>('courses');
  const [showFilters, setShowFilters] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    error,
    searchCourses,
    searchUsers,
    location,
    filters,
    setFilters,
  } = useSearch();

  useEffect(() => {
    if (searchQuery.trim()) {
      if (activeTab === 'courses') {
        searchCourses(searchQuery);
      } else {
        searchUsers(searchQuery);
      }
    }
  }, [searchQuery, activeTab, searchCourses, searchUsers]);

  const renderCourseItem = (course: GolfCourse) => (
    <View key={course.id} style={styles.courseItem}>
      <View>
        <Text style={styles.courseName}>{course.name}</Text>
        <Text style={styles.courseLocation}>{course.location}</Text>
        {course.difficulty && (
          <Text style={styles.courseDetails}>
            Difficulty: {'\u2B50'.repeat(course.difficulty)}
          </Text>
        )}
        {course.priceRange && (
          <Text style={styles.courseDetails}>Price: {course.priceRange}</Text>
        )}
      </View>
      <View style={styles.courseActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Plus size={20} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Bookmark size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity>
          <X size={20} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUserItem = (user: User) => (
    <View key={user.id} style={styles.courseItem}>
      <View>
        <Text style={styles.courseName}>{user.name}</Text>
        <Text style={styles.courseLocation}>@{user.username}</Text>
        {user.location && <Text style={styles.courseLocation}>{user.location}</Text>}
        {user.handicap !== undefined && (
          <Text style={styles.courseDetails}>Handicap: {user.handicap}</Text>
        )}
      </View>
      <View style={styles.courseActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Users size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
          onPress={() => setActiveTab('courses')}
        >
          <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'courses' ? "Search courses, location, difficulty" : "Search members"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {activeTab === 'courses' && (
            <TouchableOpacity onPress={() => setShowFilters(true)}>
              <SlidersHorizontal size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Location Bar */}
        <TouchableOpacity style={styles.locationBar}>
          <MapPin size={20} color="#64748b" />
          <Text style={styles.locationText}>
            {location ? `${location.city}, ${location.state}` : 'Current Location'}
          </Text>
          <X size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal style={styles.pillsContainer} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={styles.pill}>
          <Heart size={16} color="#64748b" />
          <Text style={styles.pillText}>Recs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pill, styles.activePill]}>
          <TrendingUp size={16} color="#fff" />
          <Text style={[styles.pillText, styles.activePillText]}>Trending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill}>
          <Users size={16} color="#64748b" />
          <Text style={styles.pillText}>Friend recs</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Results Section */}
      <View style={styles.resultsContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : loading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : (
          <>
            <Text style={styles.resultsTitle}>
              {activeTab === 'courses' 
                ? `Courses you may have played near ${location?.city || 'Boston'}, ${location?.state || 'MA'}`
                : 'Members you may know'}
            </Text>
            {activeTab === 'courses'
              ? searchResults.courses.map(renderCourseItem)
              : searchResults.users.map(renderUserItem)}
          </>
        )}
      </View>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <SearchFiltersComponent
                filters={filters}
                onFiltersChange={(newFilters) => {
                  setFilters(newFilters);
                  if (searchQuery.trim()) {
                    searchCourses(searchQuery, newFilters);
                  }
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  activePill: {
    backgroundColor: '#2563eb',
  },
  pillText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  activePillText: {
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  courseLocation: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  courseDetails: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
}); 