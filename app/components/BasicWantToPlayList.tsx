import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Course } from '../types/review';
import { MapPin } from 'lucide-react-native';

// Ultra simple component with minimal structure
export default function BasicWantToPlayList({ 
  courses = [],
  onCoursePress = () => {}
}: { 
  courses: Course[],
  onCoursePress?: (course: Course) => void 
}) {
  // Debugging count
  console.log(`⭐ BasicWantToPlayList rendering with ${courses.length} courses`);
  
  // Super simple rendering approach
  if (!courses || courses.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No bookmarked courses found</Text>
      </View>
    );
  }

  // Just render a simple, no-frills list
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Bookmarked Courses ({courses.length})</Text>
      
      <FlatList
        data={courses}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => onCoursePress(item)}
            style={styles.courseItem}
          >
            <View style={styles.courseContent}>
              <Text style={styles.courseName}>{item.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color="#666" />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  courseItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseContent: {
    flexDirection: 'column',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
}); 