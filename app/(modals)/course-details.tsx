import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { MapPin, Star, Users, X } from 'lucide-react-native';
import { getCourse } from '../utils/courses';
import type { Database } from '../utils/database.types';

type Course = Database['public']['Tables']['courses']['Row'];

export default function CourseDetailsScreen() {
  const { courseId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        if (!courseId) throw new Error('No course ID provided');
        const data = await getCourse(courseId as string);
        setCourse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || 'Course not found'}
        </Text>
      </View>
    );
  }

  const handleReviewPress = () => {
    router.push({
      pathname: '/(modals)/review',
      params: { courseId: course.id }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {course.photos && course.photos.length > 0 ? (
            <Image
              source={{ uri: course.photos[0] }}
              style={[styles.headerImage, { width }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.headerImage, { width, backgroundColor: theme.colors.surface }]} />
          )}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.back()}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Course Info */}
        <View style={styles.content}>
          <Text style={[styles.courseName, { color: theme.colors.text }]}>
            {course.name}
          </Text>

          <View style={styles.locationContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
              {course.location}
            </Text>
          </View>

          {/* Stats */}
          <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statItem}>
              <Star size={20} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {(course.rating ?? 0).toFixed(1)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Rating
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.statItem}>
              <Users size={20} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {course.total_ratings ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Reviews
              </Text>
            </View>
          </View>

          {/* Course Details */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Details</Text>
          <View style={[styles.detailsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Type</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.type ?? 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Par</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.par ?? 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Yardage</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.yardage ? `${course.yardage} yards` : 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Price Level</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {course.price_level ? '$'.repeat(course.price_level) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleReviewPress}
        >
          <Text style={[styles.reviewButtonText, { color: theme.colors.onPrimary }]}>
            Review This Course
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  headerImage: {
    height: 250,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  courseName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    marginLeft: 4,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '100%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  reviewButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
}); 