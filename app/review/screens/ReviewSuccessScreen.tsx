import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, SafeAreaView, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { format, isValid } from 'date-fns';
import { useCourse } from '../../context/CourseContext';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';
import { X } from 'lucide-react-native';
import { router as globalRouter } from 'expo-router';

export interface ReviewSuccessScreenProps {
  datePlayed: Date;
  rating?: number;
  showRating: boolean; // Indicates if user has 10+ reviews
  visitCount: number; // Still keep in props but don't display
}

export const ReviewSuccessScreen: React.FC<ReviewSuccessScreenProps> = ({
  datePlayed,
  rating,
  showRating,
  visitCount,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { course } = useCourse();
  const [isFirstReview, setIsFirstReview] = useState(false);
  const [hasMarkedFirstReview, setHasMarkedFirstReview] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  // Check if this was the user's first review
  useEffect(() => {
    const checkReviewCount = async () => {
      if (!user) return;
      
      try {
        const count = await reviewService.getUserReviewCount(user.id);
        setReviewCount(count);
        const isFirst = count === 1; // If count is exactly 1, this was their first review
        setIsFirstReview(isFirst);
        
        // Check if user already has the firstReviewCompleted flag
        const hasAlreadyCompleted = await userService.hasCompletedFirstReview(user.id);
        
        // If this is the first review and they haven't been marked as completed, update their metadata
        if (isFirst && !hasAlreadyCompleted && !hasMarkedFirstReview) {
          await userService.updateFirstReviewCompleted(user.id);
          setHasMarkedFirstReview(true);
        }
      } catch (error) {
        // Handle error silently
      }
    };
    
    checkReviewCount();
  }, [user, hasMarkedFirstReview]);

  // Set up navigation after the exiting animation
  useEffect(() => {
    if (isExiting) {
      // Disable buttons to prevent multiple clicks
      setButtonsDisabled(true);
      
      // No auto-navigation here, each button handles its own destination
      const timer = setTimeout(() => {
        // Keep the timeout to allow the animation to complete
      }, 300); // Short delay for animation
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isExiting]);

  // Safety check for course data
  if (!course) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F5EC' }}>
        <Text style={{ color: '#234D2C', fontSize: 18, textAlign: 'center' }}>
          Course data not available
        </Text>
        <Pressable 
          style={{ marginTop: 20, padding: 12 }}
          onPress={() => router.replace('/(tabs)/lists')}
        >
          <Text style={{ color: '#234D2C', textDecorationLine: 'underline' }}>
            Return to home
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleReviewAnother = () => {
    if (buttonsDisabled) return;
    
    // Disable buttons immediately to prevent multiple clicks
    setButtonsDisabled(true);
    
    // Trigger smooth exit animation
    setIsExiting(true);
    
    // Use simplified navigation approach to minimize interaction blocking
    // Directly navigate without waiting for InteractionManager
    setTimeout(() => {
      // Use replace with a specific param to signal this is coming from review success
      globalRouter.replace({
        pathname: '/(tabs)/search',
        params: {
          fromReviewSuccess: 'true',
          timestamp: Date.now().toString() // Force params to be unique to prevent stale state
        }
      });
    }, 100); // Short timeout for animation to begin
  };

  const handleClose = () => {
    if (buttonsDisabled) return;
    
    // Trigger smooth exit animation
    setIsExiting(true);

    // For first-time users coming from the first-review screen, ensure they go to the main app
    setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        if (isFirstReview) {
          globalRouter.replace('/(tabs)');
        } else {
          // Normal flow for returning users
          globalRouter.replace('/(tabs)/lists');
        }
      });
    }, 300);
  };

  // Format the date safely
  const formatDatePlayed = () => {
    try {
      // Validate that the date is actually valid
      if (!datePlayed || !isValid(datePlayed)) {
        return 'Recently';
      }
      return format(datePlayed, 'MMMM d, yyyy');
    } catch (error) {
      return 'Recently';
    }
  };

  // Calculate progress percentage for the progress bar (capped at 100%)
  const progressPercentage = Math.min(reviewCount / 10 * 100, 100);
  
  // Custom theme for this screen based on requirements
  const customColors = {
    background: '#F8F5EC',
    primaryText: '#234D2C',
    secondaryText: '#4A5E50',
  };

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: customColors.background },
        isExiting && styles.exitingContainer
      ]}
    >
      {/* X button (Close) in top right corner */}
      <Pressable 
        style={styles.closeButton} 
        onPress={handleClose}
        hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
        disabled={buttonsDisabled}
      >
        <X size={24} color={customColors.primaryText} />
      </Pressable>

      <View style={[styles.content, isExiting && styles.exitingContent]}>
        {/* User Info */}
        <View style={styles.userSection}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <DefaultAvatar size={80} />
          )}
          <Text style={[styles.username, { color: customColors.primaryText }]}>
            {user?.user_metadata?.name || user?.email || 'Golf Enthusiast'}
          </Text>
          <Text style={[styles.handle, { color: customColors.secondaryText }]}>
            @{user?.user_metadata?.username || 'golfer'}
          </Text>
        </View>

        {/* Course Info Card */}
        <View style={styles.card}>
          {/* Display first review congratulations if applicable */}
          {isFirstReview && (
            <View style={styles.firstReviewBanner}>
              <Text style={styles.firstReviewText}>🎉 Your First Review!</Text>
            </View>
          )}
          
          <Text style={[styles.courseName, { color: customColors.primaryText }]}>
            {course.name}
          </Text>
          <Text style={[styles.courseLocation, { color: customColors.secondaryText }]}>
            {course.location}
          </Text>

          {/* Rating Display */}
          {showRating && rating && (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingCircle}>
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
            </View>
          )}

          {/* First review special message */}
          {isFirstReview && (
            <View style={styles.specialMessage}>
              <Text style={[styles.specialMessageText, { color: customColors.primaryText }]}>
                Great job! Your first review helps the golfing community discover great courses.
              </Text>
            </View>
          )}

          {/* Message for users with less than 10 reviews */}
          {!showRating && (
            <View style={styles.unlockMessage}>
              <Text style={[styles.unlockText, { color: customColors.secondaryText }]}>
                {isFirstReview 
                  ? 'Continue reviewing courses to unlock personalized ratings!'
                  : 'Personalized ratings will be unlocked after reviewing 10 courses!'}
              </Text>
              
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFilled, 
                      { width: `${progressPercentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {reviewCount} of 10 reviews to unlock ratings
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.datePlayed, { color: customColors.secondaryText }]}>
            <Text>Played on </Text>
            <Text>{formatDatePlayed()}</Text>
          </Text>
        </View>

        {/* Review Another Course Button */}
        <Pressable 
          style={[styles.reviewButton, { backgroundColor: customColors.primaryText }]}
          onPress={handleReviewAnother}
          disabled={buttonsDisabled}
        >
          <Text style={styles.reviewButtonText}>
            {isFirstReview ? 'Review Your Next Course' : 'Review Another Course'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exitingContainer: {
    opacity: 0,
    transform: [{ translateY: 50 }],
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  exitingContent: {
    opacity: 0,
    transform: [{ scale: 0.95 }],
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    fontWeight: '400',
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  courseName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  courseLocation: {
    fontSize: 16,
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  ratingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F5EC',
    borderWidth: 2,
    borderColor: '#234D2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#234D2C',
  },
  unlockMessage: {
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F5EC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E3D9',
  },
  unlockText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#d1e9da',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFilled: {
    height: '100%',
    backgroundColor: '#234D2C',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#234D2C',
    fontWeight: '500',
    textAlign: 'center',
  },
  datePlayed: {
    fontSize: 16,
    marginTop: 8,
  },
  reviewButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  firstReviewBanner: {
    backgroundColor: '#e6f7ee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9cd9b3',
  },
  firstReviewText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#234D2C',
  },
  specialMessage: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f8f4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#234D2C',
  },
  specialMessageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
}); 