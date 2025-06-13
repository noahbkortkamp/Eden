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

// Cache for course data to prevent redundant loading
const courseCache = new Map<string, Course>();

export default function ComparisonModal() {
  const { courseAId, courseBId, remainingComparisons, originalSentiment, originalReviewedCourseId } = useLocalSearchParams<{
    courseAId: string;
    courseBId: string;
    remainingComparisons: string;
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
  
  // Show loading message with more detailed state
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading courses');
  const [loadingProgress, setLoadingProgress] = useState<{a: boolean, b: boolean}>({a: false, b: false});
  
  // Pre-initialize the screen with a skeleton UI immediately
  const [screenReady, setScreenReady] = useState<boolean>(false);

  // Fetch the original reviewed course rating
  useEffect(() => {
    async function fetchRatings() {
      if (!user?.id || !courseAId || !courseBId || !originalSentiment) {
        return;
      }
      
      try {
        const sentiment = originalSentiment as SentimentRating;
        
        // Fetch both the rankings and total review count in parallel
        const [rankings, userReviews] = await Promise.all([
          rankingService.refreshRankings(user.id, sentiment),
          getReviewsForUser(user.id)
        ]);
        
        // Set total review count for score visibility logic
        setTotalReviewCount(userReviews.length);
        console.log(`User has ${userReviews.length} total reviews`);
        
        // Since we're consistently keeping courseA as the originalReviewedCourse,
        // we always want to show the rating for courseB if it exists
        const courseBRanking = rankings.find(r => r.course_id === courseBId);
        
        if (courseBRanking) {
          // Format the relative_score to one decimal place for consistency
          const formattedScore = parseFloat(courseBRanking.relative_score.toFixed(1));
          console.log(`Found previous rating for course B (${courseBId}): ${courseBRanking.relative_score} -> formatted as ${formattedScore}`);
          setPreviousCourseId(courseBId);
          setPreviousCourseRating(formattedScore);
        } else {
          console.log(`No previous rating found for course B (${courseBId})`);
          setPreviousCourseId(undefined);
          setPreviousCourseRating(undefined);
        }
      } catch (error) {
        console.error('Error fetching course ratings:', error);
      }
    }
    
    fetchRatings();
  }, [user?.id, courseAId, courseBId, originalSentiment]);

  // Debounce loading changes to prevent flickering
  useEffect(() => {
    if (courseA && courseB) {
      const timer = setTimeout(() => {
        setLoading(false);
        setScreenReady(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [courseA, courseB]);

  useEffect(() => {
    // Set screen to ready after a reasonable timeout even if courses aren't loaded
    // This ensures the user sees something within a reasonable time
    const readyTimer = setTimeout(() => {
      setScreenReady(true);
    }, 300);
    
    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    async function loadCourses() {
      try {
        // Wait for the parameter check to complete
        console.log('Loading courses with IDs:', { courseAId, courseBId });
        
        if (!courseAId || !courseBId) {
          throw new Error('Missing course IDs');
        }
        
        // VALIDATION: Prevent comparing a course against itself
        if (courseAId === courseBId) {
          console.error('[ERROR] Attempted to compare a course against itself:', courseAId);
          setError('Cannot compare a course against itself');
          
          // We need to navigate to the success screen instead of just showing an error
          if (originalReviewedCourseId) {
            console.log(`Detected same-course comparison. Navigating to success screen for course: ${originalReviewedCourseId}`);
            
            try {
              // Get additional params from the original review
              if (user?.id) {
                const reviews = await reviewService.getReviewsForUser(user.id);
                const courseReview = reviews.find(r => r.course_id === originalReviewedCourseId);
                
                if (courseReview) {
                  // First clear the error we set earlier
                  setError(null);
                  
                  console.log(`Found review for ${originalReviewedCourseId}, navigating to success screen`);
                  // Use replace instead of push to avoid navigation stack issues
                  router.replace({
                    pathname: '/(modals)/review-success',
                    params: {
                      courseId: originalReviewedCourseId,
                      datePlayed: courseReview.date_played || new Date().toISOString()
                    }
                  });
                  return;
                }
              }
              
              // If we couldn't find the review or there's no user, fall back to a more basic approach
              console.log('Falling back to basic navigation for same-course comparison');
              router.replace({
                pathname: '/(modals)/review-success',
                params: {
                  courseId: originalReviewedCourseId,
                  datePlayed: new Date().toISOString()
                }
              });
            } catch (err) {
              console.error('Error handling same-course comparison:', err);
              // If there's an error getting the review, still navigate to success but with minimal params
              router.replace({
                pathname: '/(modals)/review-success',
                params: {
                  courseId: originalReviewedCourseId,
                  datePlayed: new Date().toISOString()
                }
              });
            }
            return;
          } else {
            // Fallback if we don't have the original course ID
            console.log('No original reviewed course ID, returning to lists tab');
            router.replace('/(tabs)/lists');
            return;
          }
        }
        
        // Continue with normal course loading...
        setLoadingMessage('Loading course data...');

        // Helper function to load a course with caching
        const loadCourseWithCache = async (id: string, label: string): Promise<Course> => {
          // Check in-memory cache first
          if (courseCache.has(id)) {
            console.log(`Using cached data for ${label} course: ${id}`);
            return courseCache.get(id)!;
          }
          
          setLoadingMessage(`Loading ${label} course...`);
          try {
            const course = await getCourse(id);
            
            if (!course) {
              throw new Error(`Failed to load ${label} course`);
            }
            
            // Cache the result for future use
            courseCache.set(id, course);
            
            // Update progress indicator
            setLoadingProgress(prev => ({
              ...prev,
              [label === 'first' ? 'a' : 'b']: true
            }));
            
            return course;
          } catch (err) {
            console.error(`Error loading ${label} course:`, err);
            throw err;
          }
        };

        // Set a short timeout before loading to allow the UI to render first
        await new Promise(resolve => setTimeout(resolve, 50));

        // Load courses in parallel with individual error handling
        const courseAPromise = loadCourseWithCache(courseAId, 'first');
        const courseBPromise = loadCourseWithCache(courseBId, 'second');
        
        // Update UI as soon as first course loads
        courseAPromise.then(course => {
          setCourseA(course);
        }).catch(err => {
          console.error('Failed to load course A:', err);
        });
        
        // Update UI as soon as second course loads
        courseBPromise.then(course => {
          setCourseB(course);
        }).catch(err => {
          console.error('Failed to load course B:', err);
        });
        
        // Wait for both to complete
        const [courseAData, courseBData] = await Promise.all([
          courseAPromise, 
          courseBPromise
        ]);

        console.log('Loaded courses:', {
          courseA: { id: courseAData.id, name: courseAData.name },
          courseB: { id: courseBData.id, name: courseBData.name }
        });

        // Final state update to ensure both are set
        setCourseA(courseAData);
        setCourseB(courseBData);
      } catch (err) {
        console.error('Detailed error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
        // After error, wait 2 seconds then return to feed
        setTimeout(() => {
          router.replace('/(tabs)/lists');
        }, 2000);
      } finally {
        // We'll set loading to false in the debounced effect
      }
    }

    loadCourses();
  }, [courseAId, courseBId, router]);

  // Use useEffect to handle navigation when no courses are found
  useEffect(() => {
    if (screenReady && !loading && (!courseA || !courseB)) {
                router.replace('/(tabs)/lists');
    }
  }, [screenReady, loading, courseA, courseB, router]);

  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    try {
      console.log('Handling comparison selection:', {
        selectedId,
        notSelectedId,
        selectedCourse: courseA?.id === selectedId ? courseA?.name : courseB?.name,
        notSelectedCourse: courseA?.id === notSelectedId ? courseA?.name : courseB?.name
      });
      
      // Early navigation to improve perceived performance
      // We'll continue the operation in the background
      const nextStepPromise = handleComparison(selectedId, notSelectedId);
      
      // Give the animation some time to start before continuing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Continue with the comparison handling in the background
      nextStepPromise.catch(error => {
        console.error('Error in comparison selection:', error);
      });
    } catch (error) {
      console.error('Error in comparison selection:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit comparison');
    }
  };

  const handleSkip = async () => {
    try {
      console.log('Handling comparison skip:', {
        courseAId: courseA?.id,
        courseBId: courseB?.id
      });
      
      // Give the animation some time to start before continuing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Call skipComparison - it doesn't return a Promise, so we don't need to handle .catch()
      skipComparison(courseA?.id || '', courseB?.id || '');
    } catch (error) {
      console.error('Error in comparison skip:', error);
      setError(error instanceof Error ? error.message : 'Failed to skip comparison');
    }
  };

  const renderContent = () => {
    if (!screenReady) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Preparing comparison...
          </Text>
        </View>
      );
    }

    if (loading && (!courseA || !courseB)) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <View>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              {loadingMessage}
              {loadingProgress.a && !loadingProgress.b ? " (1/2 loaded)" : ""}
            </Text>
          </View>
        </View>
      );
    }

    if (error || (!courseA && !courseB)) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Failed to load courses'}
          </Text>
        </View>
      );
    }

    if (!courseA || !courseB) {
      // Show skeleton UI if only one course loaded
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Which course do you prefer?
          </Text>
          <View style={styles.coursesContainer}>
            {/* Show actual course if available, otherwise skeleton */}
            {courseA ? (
              <>
                <View style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.courseName, { color: theme.colors.text }]}>{courseA.name}</Text>
                  <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
                    {courseA.location}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.skeletonText, { width: '70%', backgroundColor: theme.colors.border }]} />
                  <View style={[styles.skeletonText, { width: '50%', backgroundColor: theme.colors.border }]} />
                </View>
              </>
            )}
            
            <View style={styles.vsContainer}>
              <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>VS</Text>
            </View>
            
            {courseB ? (
              <>
                <View style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.courseName, { color: theme.colors.text }]}>{courseB.name}</Text>
                  <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
                    {courseB.location}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.courseCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.skeletonText, { width: '70%', backgroundColor: theme.colors.border }]} />
                  <View style={[styles.skeletonText, { width: '50%', backgroundColor: theme.colors.border }]} />
                </View>
              </>
            )}
            
            <ActivityIndicator style={styles.loadingIndicator} color={theme.colors.primary} />
          </View>
        </View>
      );
    }

    // Both courses loaded, show the full comparison UI
    return (
      <CourseComparisonScreen
        courseA={courseA}
        courseB={courseB}
        previousCourseId={previousCourseId}
        previousCourseRating={previousCourseRating}
        totalReviewCount={totalReviewCount}
        originalSentiment={originalSentiment as SentimentRating}
        onSelect={handleSelect}
        onSkip={handleSkip}
      />
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Skeleton UI styles
  coursesContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  courseCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonText: {
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  courseName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 16,
    opacity: 0.7,
  },
  vsContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginTop: 16,
  }
}); 