import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { MapPin, Star, Users, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { getCourse } from '../utils/courses';
import type { Database } from '../utils/database.types';
import { useAuth } from '../context/AuthContext';
import { bookmarkService } from '../services/bookmarkService';
import { usePlayedCourses } from '../context/PlayedCoursesContext';
import { Card } from '../components/eden/Card';
import { Heading1, Heading2, Heading3, BodyText, SmallText, Caption } from '../components/eden/Typography';
import { Button } from '../components/eden/Button';
import { Icon } from '../components/eden/Icon';

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
  const theme = useEdenTheme();
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

  const handleReviewPress = () => {
    // Add a small delay to prevent touch event issues
    setTimeout(() => {
      router.push({
        pathname: '/(modals)/review',
        params: { courseId: course?.id }
      });
    }, 50);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <SmallText style={styles.loadingText}>Loading course details...</SmallText>
        </View>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <SmallText color={theme.colors.error}>
            {error || 'Course not found'}
          </SmallText>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        {/* Header with Image */}
        <View style={styles.imageContainer}>
          {course.photos && course.photos.length > 0 ? (
            <Image
              source={{ uri: course.photos[0] }}
              style={[styles.headerImage, { width }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.headerImage, { width, backgroundColor: theme.colors.surface }]}>
              <Icon name="Golf" size="hero" color={theme.colors.textSecondary} />
            </View>
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
            <Heading2>{course.name}</Heading2>
            <View style={styles.locationContainer}>
              <MapPin size={14} color={theme.colors.textSecondary} />
              <SmallText color={theme.colors.textSecondary} style={styles.locationText}>
                {course.location}
              </SmallText>
            </View>
          </View>

          {/* Stats Section */}
          <Card style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Star size={18} color={theme.colors.primary} />
              <Heading3 style={styles.statValue}>
                {(course.rating ?? 0).toFixed(1)}
              </Heading3>
              <SmallText color={theme.colors.textSecondary}>
                Rating
              </SmallText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.statItem}>
              <Users size={18} color={theme.colors.primary} />
              <Heading3 style={styles.statValue}>
                {course.total_ratings ?? 0}
              </Heading3>
              <SmallText color={theme.colors.textSecondary}>
                Reviews
              </SmallText>
            </View>
          </Card>

          {/* Course Details */}
          <View style={styles.sectionHeader}>
            <BodyText bold>Details</BodyText>
          </View>
          
          <Card style={styles.detailsGrid}>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <SmallText color={theme.colors.textSecondary}>Type</SmallText>
                <BodyText>{course.type ?? 'N/A'}</BodyText>
              </View>
              
              <View style={styles.detailItem}>
                <SmallText color={theme.colors.textSecondary}>Par</SmallText>
                <BodyText>{course.par ?? 'N/A'}</BodyText>
              </View>
            </View>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <SmallText color={theme.colors.textSecondary}>Yardage</SmallText>
                <BodyText>{course.yardage ? `${course.yardage} yards` : 'N/A'}</BodyText>
              </View>
              
              <View style={styles.detailItem}>
                <SmallText color={theme.colors.textSecondary}>Price</SmallText>
                <BodyText>
                  {course.price_level ? '$'.repeat(course.price_level) : 'N/A'}
                </BodyText>
              </View>
            </View>
          </Card>

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <Button
              label="Review This Course"
              onPress={handleReviewPress}
              fullWidth
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImage: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  courseHeader: {
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
  statValue: {
    marginVertical: 4,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  detailItem: {
    flex: 1,
    padding: 8,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  loadingText: {
    marginTop: 12,
  },
}); 