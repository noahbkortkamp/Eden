import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { CourseComparisonProps } from '../../types/review';

const { width } = Dimensions.get('window');

export const CourseComparisonScreen: React.FC<CourseComparisonProps> = ({
  courseA,
  courseB,
  onSelect,
  onSkip,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which course do you prefer?</Text>
      
      <View style={styles.coursesContainer}>
        {/* Course A */}
        <TouchableOpacity
          style={styles.courseCard}
          onPress={() => onSelect(courseA.course_id)}
        >
          <Image
            source={{ uri: `https://api.example.com/courses/${courseA.course_id}/image` }}
            style={styles.courseImage}
            contentFit="cover"
          />
          <View style={styles.courseInfo}>
            <Text style={styles.courseName}>{courseA.name}</Text>
            <Text style={styles.courseLocation}>{courseA.location}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                ⭐️ {courseA.average_rating.toFixed(1)}
              </Text>
              <Text style={styles.statText}>
                📝 {courseA.total_reviews} reviews
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.vsText}>VS</Text>

        {/* Course B */}
        <TouchableOpacity
          style={styles.courseCard}
          onPress={() => onSelect(courseB.course_id)}
        >
          <Image
            source={{ uri: `https://api.example.com/courses/${courseB.course_id}/image` }}
            style={styles.courseImage}
            contentFit="cover"
          />
          <View style={styles.courseInfo}>
            <Text style={styles.courseName}>{courseB.name}</Text>
            <Text style={styles.courseLocation}>{courseB.location}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                ⭐️ {courseB.average_rating.toFixed(1)}
              </Text>
              <Text style={styles.statText}>
                📝 {courseB.total_reviews} reviews
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Too tough to choose</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  coursesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseCard: {
    width: width * 0.4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseImage: {
    width: '100%',
    height: width * 0.3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  courseInfo: {
    padding: 12,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
    color: '#495057',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  skipButton: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
}); 