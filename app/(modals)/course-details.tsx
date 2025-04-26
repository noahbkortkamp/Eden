import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { MapPin, Star, Users, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { getCourse } from '../utils/courses';
import type { Database } from '../utils/database.types';
import { useAuth } from '../context/AuthContext';
import { bookmarkService } from '../services/bookmarkService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';

type Course = Database['public']['Tables']['courses']['Row'];

export default function CourseDetailsScreen() {
  // Configure the Stack.Screen outside of the component body
  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <CourseDetailsContent />
    </>
  );
}

// Separate the content into its own component to avoid re-rendering issues
function CourseDetailsContent() {
  const { courseId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { setNeedsRefresh } = usePlayedCourses();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Load course data
  useEffect(() => {
    let isMounted = true;
    
    async function loadCourse() {
      try {
        if (!courseId) throw new Error('No course ID provided');
        
        // Get course data
        const data = await getCourse(courseId as string);
        if (!isMounted) return;
        setCourse(data);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load course');
        setLoading(false);
      }
    }

    loadCourse();
    
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Separate effect for bookmark status to avoid dependencies on user
  useEffect(() => {
    let isMounted = true;
    
    async function checkBookmarkStatus() {
      if (!user || !courseId) return;
      
      try {
        const bookmarkedIds = await bookmarkService.getBookmarkedCourseIds(user.id);
        if (!isMounted) return;
        setIsBookmarked(bookmarkedIds.includes(courseId as string));
      } catch (err) {
        console.error('Error checking bookmark status:', err);
      }
    }
    
    if (course) {
      checkBookmarkStatus();
    }
    
    return () => {
      isMounted = false;
    };
  }, [courseId, user, course]);

  const handleToggleBookmark = async () => {
    if (!user || !courseId || !course) return;
    
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await bookmarkService.removeBookmark(user.id, courseId as string);
        setIsBookmarked(false);
      } else {
        await bookmarkService.addBookmark(user.id, courseId as string);
        setIsBookmarked(true);
      }
      
      // Trigger refresh of the bookmarks list
      setNeedsRefresh();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with Image */}
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
          style={[styles.bookmarkButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleToggleBookmark}
          disabled={bookmarkLoading}
        >
          {bookmarkLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : isBookmarked ? (
            <BookmarkCheck size={24} color={theme.colors.primary} />
          ) : (
            <Bookmark size={24} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Course Header */}
        <View style={styles.courseHeader}>
          <View>
            <Text style={[styles.courseName, { color: theme.colors.text }]}>
              {course.name}
            </Text>
            <View style={styles.locationContainer}>
              <MapPin size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.location, { color: theme.colors.textSecondary }]}>
                {course.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Star size={18} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {(course.rating ?? 0).toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Rating
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.statItem}>
            <Users size={18} color={theme.colors.primary} />
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
        <View style={[styles.detailsGrid, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Type</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.type ?? 'N/A'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Par</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.par ?? 'N/A'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Yardage</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{course.yardage ? `${course.yardage} yards` : 'N/A'}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Price</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {course.price_level ? '$'.repeat(course.price_level) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleReviewPress}
        >
          <Text style={[styles.reviewButtonText, { color: theme.colors.onPrimary }]}>
            Review This Course
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    height: 180,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    marginLeft: 4,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    padding: 8,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  reviewButton: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
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