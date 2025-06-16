import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { CourseComparisonScreen } from '../review/screens/CourseComparisonScreen';
import { Course, SentimentRating } from '../types/review';
import { useReview } from '../review/context/ReviewContext';
import { useTheme } from '../theme/ThemeProvider';
import { getCourse } from '../utils/courses';
import { rankingService } from '../services/rankingService';
import { useAuth } from '../context/AuthContext';
import { getReviewsForUser } from '../utils/reviews';
import { reviewService } from '../services/reviewService';

// 🚀 Phase 1.3: Enhanced course cache with timestamp for intelligent caching
interface CachedCourse {
  course: Course;
  timestamp: number;
}

const courseCache = new Map<string, CachedCourse>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// 🚀 Phase 1.3: Intelligent cache management
const getCachedCourse = (courseId: string): Course | null => {
  const cached = courseCache.get(courseId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.course;
  }
  if (cached) {
    courseCache.delete(courseId); // Remove expired cache
  }
  return null;
};

const setCachedCourse = (courseId: string, course: Course): void => {
  courseCache.set(courseId, {
    course,
    timestamp: Date.now()
  });
};

export default function ComparisonModal() {
  const { courseAId, courseBId, remainingComparisons, totalComparisons, originalSentiment, originalReviewedCourseId } = useLocalSearchParams<{
    courseAId: string;
    courseBId: string;
    remainingComparisons: string;
    totalComparisons?: string;
    originalSentiment?: string;
    originalReviewedCourseId?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const { handleComparison, skipComparison } = useReview();
  const { user } = useAuth();
  const [courseA, setCourseA] = useState<Course | null>(null);
  const [courseB, setCourseB] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousCourseId, setPreviousCourseId] = useState<string | undefined>(undefined);
  const [previousCourseRating, setPreviousCourseRating] = useState<number | undefined>(undefined);
  const [totalReviewCount, setTotalReviewCount] = useState<number>(0);
  
  // 🚀 Phase 1.3: Simplified loading state
  const [loadingMessage, setLoadingMessage] = useState<string>('Preparing comparison...');
  
  // 🚀 Phase 1.3: Pre-initialize the screen for faster perceived loading
  const [screenReady, setScreenReady] = useState<boolean>(false);

  // 🚀 Phase 1.3: Enhanced course loading with better error handling and parallel loading
  useEffect(() => {
    async function loadCoursesOptimized() {
      try {
        setLoadingMessage('Loading courses...');
        
        if (!courseAId || !courseBId) {
          throw new Error('Missing course IDs');
        }
        
        // VALIDATION: Prevent comparing a course against itself
        if (courseAId === courseBId) {
          console.error('[ERROR] Attempted to compare a course against itself:', courseAId);
          
          // Navigate to success screen for same-course comparison
                     if (originalReviewedCourseId && user?.id) {
             try {
               const reviews = await getReviewsForUser(user.id);
               const courseReview = reviews.find(r => r.course_id === originalReviewedCourseId);
              
              if (courseReview) {
                router.replace({
                  pathname: '/(modals)/review-success',
                  params: {
                    courseId: originalReviewedCourseId,
                    datePlayed: courseReview.date_played || new Date().toISOString()
                  }
                });
                return;
              }
            } catch (err) {
              console.error('Error handling same-course comparison:', err);
            }
          }
          
          // Fallback to lists
          router.replace('/(tabs)/lists');
          return;
        }

        // 🚀 Phase 1.3: Check cache first for both courses
        let courseAData = getCachedCourse(courseAId);
        let courseBData = getCachedCourse(courseBId);
        
        // 🚀 Phase 1.3: Parallel loading for courses not in cache
        const loadPromises: Promise<Course>[] = [];
        
        if (!courseAData) {
          loadPromises.push(
            getCourse(courseAId).then(course => {
              setCachedCourse(courseAId, course);
              return course;
            })
          );
        } else {
          console.log('💾 Cache hit for Course A:', courseAData.name);
        }
        
        if (!courseBData) {
          loadPromises.push(
            getCourse(courseBId).then(course => {
              setCachedCourse(courseBId, course);
              return course;
            })
          );
        } else {
          console.log('💾 Cache hit for Course B:', courseBData.name);
        }

        // 🚀 Phase 1.3: Load missing courses in parallel
        if (loadPromises.length > 0) {
          setLoadingMessage(`Loading ${loadPromises.length} course${loadPromises.length > 1 ? 's' : ''}...`);
          const loadedCourses = await Promise.all(loadPromises);
          
          // Assign loaded courses to correct variables
          let loadIndex = 0;
          if (!courseAData) {
            courseAData = loadedCourses[loadIndex++];
          }
          if (!courseBData) {
            courseBData = loadedCourses[loadIndex++];
          }
        }

        // 🚀 Phase 1.3: Parallel loading of review data
        setLoadingMessage('Loading review data...');
        
        const [reviewsData] = await Promise.all([
          user?.id ? getReviewsForUser(user.id) : Promise.resolve([])
        ]);

        // Set total review count
        setTotalReviewCount(reviewsData.length);

        // 🚀 Phase 1.3: Determine which course is the previously reviewed one and get its ranking score
        // The originalReviewedCourseId is the NEW course, so the OTHER course is the existing one with a score
        let existingCourseId: string | null = null;
        let existingCourseScore: number | undefined = undefined;
        
        if (originalReviewedCourseId === courseAId) {
          // Course A is new, Course B is existing
          existingCourseId = courseBId;
        } else if (originalReviewedCourseId === courseBId) {
          // Course B is new, Course A is existing  
          existingCourseId = courseAId;
        } else {
          // Neither course is the original - this could be a subsequent comparison
          // Check which course has a review to determine the existing one
          const courseAReview = reviewsData.find(r => r.course_id === courseAId);
          const courseBReview = reviewsData.find(r => r.course_id === courseBId);
          
          if (courseAReview && !courseBReview) {
            existingCourseId = courseAId;
          } else if (courseBReview && !courseAReview) {
            existingCourseId = courseBId;
          } else if (courseAReview && courseBReview) {
            // Both have reviews - use the one that's not the original
            existingCourseId = originalReviewedCourseId === courseAId ? courseBId : courseAId;
          }
        }

        // 🚀 Get the ranking score for the existing course
        if (existingCourseId && originalSentiment) {
          try {
            console.log(`🔍 Getting ranking score for existing course ${existingCourseId.substring(0, 8)} in ${originalSentiment} tier`);
            const rankings = await rankingService.getUserRankings(user.id, originalSentiment);
            const existingCourseRanking = rankings.find(r => r.course_id === existingCourseId);
            
            if (existingCourseRanking) {
              existingCourseScore = existingCourseRanking.relative_score;
              console.log(`✅ Found ranking score ${existingCourseScore} for course ${existingCourseId.substring(0, 8)}`);
            } else {
              console.log(`⚠️ No ranking found for course ${existingCourseId.substring(0, 8)} in ${originalSentiment} tier`);
            }
          } catch (err) {
            console.error('Error getting ranking score:', err);
          }
        }

        // Set the previous course data for display
        if (existingCourseId && existingCourseScore !== undefined) {
          setPreviousCourseId(existingCourseId);
          setPreviousCourseRating(existingCourseScore);
          console.log(`📊 Comparison setup: ${existingCourseId === courseAId ? 'Course A' : 'Course B'} will show score ${existingCourseScore}`);
        }

        console.log('🚀 Comparison ready:', {
          courseA: { id: courseAData!.id, name: courseAData!.name },
          courseB: { id: courseBData!.id, name: courseBData!.name },
          totalReviews: reviewsData.length,
          cachedA: !!getCachedCourse(courseAId),
          cachedB: !!getCachedCourse(courseBId),
          originalReviewedCourse: originalReviewedCourseId?.substring(0, 8),
          existingCourse: existingCourseId?.substring(0, 8),
          existingCourseScore: existingCourseScore,
          sentiment: originalSentiment
        });

        // 🚀 Phase 1.3: Set courses simultaneously to prevent multiple renders
        setCourseA(courseAData!);
        setCourseB(courseBData!);
        setScreenReady(true);
        setLoading(false);
        
      } catch (err) {
        console.error('Detailed error loading courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
        setScreenReady(true);
        
        // Auto-navigate away on error
        setTimeout(() => {
          router.replace('/(tabs)/lists');
        }, 2000);
      }
    }

    loadCoursesOptimized();
  }, [courseAId, courseBId, router, user?.id, originalReviewedCourseId]);

  // 🚀 Phase 1.3: Optimized handlers
  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    await handleComparison(selectedId, notSelectedId);
  };

  const handleSkip = async (courseAId: string, courseBId: string) => {
    await skipComparison(courseAId, courseBId);
  };

  const renderContent = () => {
    if (!screenReady || loading) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {loadingMessage}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Redirecting...
          </Text>
        </View>
      );
    }

    if (!courseA || !courseB) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Failed to load courses
          </Text>
        </View>
      );
    }

    // Both courses loaded, show the optimized comparison UI
    return (
      <CourseComparisonScreen
        courseA={courseA}
        courseB={courseB}
        previousCourseId={previousCourseId}
        previousCourseRating={previousCourseRating}
        totalReviewCount={totalReviewCount}
        originalSentiment={originalSentiment as SentimentRating}
        remainingComparisons={remainingComparisons ? parseInt(remainingComparisons) : undefined}
        totalComparisons={totalComparisons ? parseInt(totalComparisons) : undefined}
        onSelect={handleSelect}
        onSkip={handleSkip}
      />
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: `Comparison ${remainingComparisons && totalComparisons ? `(${parseInt(totalComparisons) - parseInt(remainingComparisons) + 1}/${totalComparisons})` : remainingComparisons ? `(${remainingComparisons} remaining)` : ''}`,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderContent()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
}); 