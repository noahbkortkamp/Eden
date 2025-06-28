import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  ScrollView,
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
import { courseRankingsService } from '../services/courseRankingsService';
import { reviewService } from '../services/reviewService';
import { formatScoreForDisplay } from '@/app/utils/scoreDisplay';

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
  const [courseStats, setCourseStats] = useState<{
    averageScore: number;
    totalRankings: number;
    currentUserScore?: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Array<{
    id: string;
    notes: string;
    datePlayed: string;
    userName: string;
    avatarUrl?: string;
  }>>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [reviewCheckLoading, setReviewCheckLoading] = useState(false);

  // Cache for review status to prevent repeated API calls
  const [reviewStatusCache, setReviewStatusCache] = useState<Map<string, boolean>>(new Map());

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

  // Check if user has already reviewed this course
  useEffect(() => {
    let isMounted = true;
    
    async function checkUserReview() {
      if (!user || !courseId) return;
      
      const cacheKey = `${user.id}-${courseId}`;
      
      // Check cache first
      if (reviewStatusCache.has(cacheKey)) {
        const cachedStatus = reviewStatusCache.get(cacheKey)!;
        setHasUserReviewed(cachedStatus);
        console.log(`Using cached review status for course ${courseId}: ${cachedStatus}`);
        return;
      }
      
      setReviewCheckLoading(true);
      try {
        const existingReview = await reviewService.getUserCourseReview(user.id, courseId as string);
        if (!isMounted) return;
        
        const hasReviewed = !!existingReview;
        setHasUserReviewed(hasReviewed);
        
        // Cache the result
        setReviewStatusCache(prev => new Map(prev).set(cacheKey, hasReviewed));
        console.log(`Cached review status for course ${courseId}: ${hasReviewed}`);
      } catch (err) {
        console.error('Error checking user review:', err);
        if (!isMounted) return;
        // If check fails, allow the review (default to false)
        setHasUserReviewed(false);
      } finally {
        if (isMounted) {
          setReviewCheckLoading(false);
        }
      }
    }
    
    if (course) {
      checkUserReview();
    }
    
    return () => {
      isMounted = false;
    };
  }, [courseId, user, course, reviewStatusCache]);

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

  // Load course statistics from rankings
  useEffect(() => {
    let isMounted = true;

    async function loadCourseStats() {
      if (!courseId) return;

      setStatsLoading(true);
      try {
        const stats = await courseRankingsService.getCourseStatistics(
          courseId as string,
          user?.id
        );
        if (!isMounted) return;
        setCourseStats(stats);
      } catch (err) {
        console.error('Error loading course statistics:', err);
        // Set default stats on error
        setCourseStats({
          averageScore: 0,
          totalRankings: 0
        });
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    }

    if (course) {
      loadCourseStats();
    }

    return () => {
      isMounted = false;
    };
  }, [courseId, user, course]);

  // Load review notes from users
  useEffect(() => {
    let isMounted = true;

    async function loadReviewNotes() {
      if (!courseId) return;

      setNotesLoading(true);
      try {
        const notes = await courseRankingsService.getCourseReviewNotes(
          courseId as string,
          8 // Load up to 8 recent review notes
        );
        if (!isMounted) return;
        setReviewNotes(notes);
      } catch (err) {
        console.error('Error loading review notes:', err);
        // Set empty array on error
        setReviewNotes([]);
      } finally {
        if (isMounted) {
          setNotesLoading(false);
        }
      }
    }

    if (course) {
      loadReviewNotes();
    }

    return () => {
      isMounted = false;
    };
  }, [courseId, course]);

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

  const handleReviewNotePress = (reviewId: string) => {
    router.push({
      pathname: '/review/friend-detail',
      params: { reviewId }
    });
  };

  // Function to invalidate cache for this course (can be called when user submits a review)
  const invalidateReviewCache = useCallback((courseId: string) => {
    if (!user) return;
    const cacheKey = `${user.id}-${courseId}`;
    setReviewStatusCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(cacheKey);
      console.log(`Invalidated review cache for course ${courseId}`);
      return newCache;
    });
  }, [user]);

  // Note: We intentionally don't auto-invalidate the cache to prevent infinite loops
  // The cache will persist for the session, which is the desired behavior
  // If a review is submitted, the user will see the updated status on next app launch/page refresh

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
              {statsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Heading3 style={styles.statValue}>
                  {courseStats?.averageScore ? courseStats.averageScore.toFixed(1) : '0.0'}
                </Heading3>
              )}
              <SmallText color={theme.colors.textSecondary}>
                out of 10
              </SmallText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity 
              style={[
                styles.statItem, 
                (courseStats?.totalRankings && courseStats.totalRankings > 0) && styles.clickableStatItem
              ]}
              onPress={() => {
                if (courseStats?.totalRankings && courseStats.totalRankings > 0) {
                  router.push({
                    pathname: '/(modals)/course-reviews',
                    params: { courseId: course?.id }
                  });
                }
              }}
              disabled={!courseStats?.totalRankings || courseStats.totalRankings === 0}
              activeOpacity={0.7}
            >
              <Users size={18} color={theme.colors.primary} />
              {statsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Heading3 style={styles.statValue}>
                  {courseStats?.totalRankings ?? 0}
                </Heading3>
              )}
              <SmallText color={theme.colors.textSecondary}>
                Reviews
              </SmallText>
            </TouchableOpacity>
          </Card>

          {/* Current User Score (if available) */}
          {courseStats?.currentUserScore && (
            <Card style={[styles.statsContainer, { marginBottom: 8 }]}>
              <View style={[styles.statItem, { flex: 1, alignItems: 'flex-start', padding: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Icon name="User" size="inline" color={theme.colors.primary} />
                  <SmallText color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
                    Your ranking:
                  </SmallText>
                </View>
                <BodyText style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  {formatScoreForDisplay(courseStats.currentUserScore).toFixed(1)} out of 10
                </BodyText>
              </View>
            </Card>
          )}

          {/* Review Notes */}
          <View style={styles.sectionHeader}>
            <BodyText bold>Recent Reviews</BodyText>
          </View>
          
          {notesLoading ? (
            <Card style={[styles.notesCard, { alignItems: 'center', padding: 20 }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <SmallText color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
                Loading reviews...
              </SmallText>
            </Card>
          ) : reviewNotes.length > 0 ? (
            <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
              {reviewNotes.map((note, index) => (
                <TouchableOpacity key={index} onPress={() => handleReviewNotePress(note.id)}>
                  <Card style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <View style={styles.userInfo}>
                        {note.avatarUrl ? (
                          <Image
                            source={{ uri: note.avatarUrl }}
                            style={styles.avatar}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                            <Icon name="User" size="inline" color={theme.colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.userDetails}>
                          <BodyText style={styles.userName}>{note.userName}</BodyText>
                          <SmallText color={theme.colors.textSecondary}>
                            {note.datePlayed ? new Date(note.datePlayed).toLocaleDateString() : 'Date not available'}
                          </SmallText>
                        </View>
                      </View>
                    </View>
                    <BodyText style={styles.noteText}>{note.notes}</BodyText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Card style={[styles.notesCard, { alignItems: 'center', padding: 20 }]}>
              <Icon name="MessageSquare" size="large" color={theme.colors.textSecondary} />
              <BodyText color={theme.colors.textSecondary} style={{ marginTop: 8, textAlign: 'center' }}>
                No review notes yet
              </BodyText>
              <SmallText color={theme.colors.textSecondary} style={{ marginTop: 4, textAlign: 'center' }}>
                Be the first to share your experience!
              </SmallText>
            </Card>
          )}

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            {reviewCheckLoading ? (
              <Button
                label="Checking..."
                fullWidth
                disabled
              />
            ) : hasUserReviewed ? (
              <Card style={[styles.alreadyReviewedCard, { borderColor: theme.colors.primary }]}>
                <View style={styles.alreadyReviewedContent}>
                  <Icon name="CheckCircle" size="large" color={theme.colors.primary} />
                  <View style={styles.alreadyReviewedText}>
                    <BodyText style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      Course Reviewed!
                    </BodyText>
                    <SmallText color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: 2 }}>
                      You have already reviewed this course
                    </SmallText>
                  </View>
                </View>
              </Card>
            ) : (
              <Button
                label="Review This Course"
                onPress={handleReviewPress}
                fullWidth
              />
            )}
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
    height: 120,
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
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  courseHeader: {
    marginBottom: 12,
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
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  clickableStatItem: {
    backgroundColor: 'rgba(35, 77, 44, 0.04)', // Subtle background tint
    borderRadius: 8,
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
  notesContainer: {
    maxHeight: 300, // Limit height to make it scrollable
    marginBottom: 16,
  },
  notesCard: {
    padding: 16,
    marginBottom: 16,
  },
  noteCard: {
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  noteText: {
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  loadingText: {
    marginTop: 12,
  },
  alreadyReviewedCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 16,
  },
  alreadyReviewedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyReviewedText: {
    flex: 1,
    marginLeft: 12,
  },
}); 