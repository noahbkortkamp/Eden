import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { GolfCourse, searchCourses } from '../data/courses';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CourseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GolfCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const results = searchCourses(searchQuery);
    setSearchResults(results);
  }, [searchQuery]);

  const handleCourseSelect = (course: GolfCourse) => {
    setSelectedCourse(course);
    setSearchQuery(course.name);
    setSearchResults([]);
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      
      // Store selected course in AsyncStorage
      const courseData = selectedCourse ? 
        `${selectedCourse.name}, ${selectedCourse.city}, ${selectedCourse.state}` : 
        'not_specified';
        
      await AsyncStorage.setItem('eden_home_course', courseData);
      
      // Navigate to the final onboarding screen
      router.replace('/onboarding/done');
    } catch (error) {
      console.error('Error saving home course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      
      // Store default value
      await AsyncStorage.setItem('eden_home_course', 'not_specified');
      
      // Navigate to the final onboarding screen
      router.replace('/onboarding/done');
    } catch (error) {
      console.error('Error skipping home course selection:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Want to add your home course?
      </Text>
      
      <TextInput
        label="Search for a golf course"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        mode="outlined"
        outlineColor="#ddd"
        activeOutlineColor="#245E2C"
      />
      
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleCourseSelect(item)}
            >
              <Text style={styles.courseName}>{item.name}</Text>
              <Text style={styles.courseLocation}>{item.city}, {item.state}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={loading || (!selectedCourse && searchQuery.trim() !== '')}
          style={styles.continueButton}
          buttonColor="#245E2C"
        >
          Continue
        </Button>
        
        <Button
          mode="text"
          onPress={handleSkip}
          disabled={loading}
          style={styles.skipButton}
        >
          Skip
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  searchInput: {
    marginBottom: 16,
  },
  resultsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '500',
  },
  courseLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  continueButton: {
    marginTop: 16,
    backgroundColor: '#245E2C', // Masters green
    padding: 8,
  },
  skipButton: {
    marginTop: 8,
  },
}); 