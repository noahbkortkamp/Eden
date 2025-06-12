import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Dimensions, InteractionManager, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useEdenTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { format, isValid } from 'date-fns';
import { useCourse } from '../../context/CourseContext';
import { Locate, ChevronRight, Award, ThumbsUp } from 'lucide-react-native';
import { router as globalRouter } from 'expo-router';

// Eden design system components
import {
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  SmallText,
  Button,
  Card,
  Icon,
  Divider,
} from '../../components/eden';

export interface FirstReviewSuccessScreenProps {
  datePlayed: Date;
  courseName?: string;
  courseLocation?: string;
}

export const FirstReviewSuccessScreen: React.FC<FirstReviewSuccessScreenProps> = ({
  datePlayed,
  courseName,
  courseLocation,
}) => {
  const theme = useEdenTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { course } = useCourse();
  const [isExiting, setIsExiting] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  
  // Card animation values
  const cardScale = React.useRef(new Animated.Value(0.95)).current;
  const cardOpacity = React.useRef(new Animated.Value(0)).current;

  // Get course info from props or context
  const displayCourseName = courseName || course?.name || 'your course';
  const displayCourseLocation = courseLocation || course?.location || '';

  // Animate cards on mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Set up navigation after the exiting animation
  useEffect(() => {
    if (isExiting) {
      // Disable buttons to prevent multiple clicks
      setButtonsDisabled(true);
      
      // Use InteractionManager to ensure animations complete before navigation
      const timer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          // Reset the navigation stack completely to avoid issues
          globalRouter.replace('/(tabs)/lists');
        });
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isExiting]);

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

  const handleFindNextCourse = () => {
    if (buttonsDisabled) return;
    
    // Trigger smooth exit animation
    setIsExiting(true);
    
    // Schedule navigation to search tab
    setTimeout(() => {
      // Use replace instead of navigate to reset the stack
      globalRouter.replace('/(tabs)/search');
    }, 300);
  };

  const handleGoToHome = () => {
    if (buttonsDisabled) return;
    
    // Trigger smooth exit animation
    setIsExiting(true);
    
    // Schedule navigation to main tab
    setTimeout(() => {
      // Use replace instead of navigate to reset the stack
      globalRouter.replace('/(tabs)/lists');
    }, 300);
  };
  
  // Handle close button press
  const handleClose = () => {
    if (buttonsDisabled) return;
    
    // Trigger smooth exit animation
    setIsExiting(true);
    
    // Schedule navigation to main tab
    setTimeout(() => {
      // Use replace instead of navigate to reset the stack
      globalRouter.replace('/(tabs)/lists');
    }, 300);
  };

  // Animated style for both cards
  const animatedCardStyle = {
    transform: [{ scale: cardScale }],
    opacity: cardOpacity,
  };

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        isExiting && styles.exitingContainer
      ]}
    >
      {/* Close Button */}
      <Button
        variant="tertiary"
        onPress={handleClose}
        disabled={buttonsDisabled}
        style={styles.closeButton}
        startIcon={<Icon name="X" size="action" />}
        iconOnly
      />
      
      {/* Content View with animation */}
      <View style={[styles.contentContainer, isExiting && styles.exitingContent]}>
        {/* Header with celebration icon */}
        <View style={styles.header}>
          <Icon name="Award" size="hero" color={theme.colors.primary} style={styles.celebrationIcon} />
          <Heading1 style={styles.headerTitle}>You did it!</Heading1>
          <BodyText style={styles.headerSubtitle}>Your first course review is complete!</BodyText>
        </View>

        {/* Center content container */}
        <View style={styles.centerContentContainer}>
          {/* Course Review Card */}
          <Animated.View style={animatedCardStyle}>
            <Card variant="default" style={styles.card}>
              <SmallText style={styles.cardTitle}>You reviewed:</SmallText>
              
              <View style={styles.courseContainer}>
                <Heading3 style={styles.courseName} numberOfLines={1}>{displayCourseName}</Heading3>
                
                {displayCourseLocation && (
                  <View style={styles.locationContainer}>
                    <Icon name="MapPin" size="inline" color={theme.colors.textSecondary} />
                    <SmallText style={styles.courseLocation} numberOfLines={1}>{displayCourseLocation}</SmallText>
                  </View>
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              <SmallText style={styles.dateLabel}>
                Played on <SmallText style={styles.dateValue}>{formatDatePlayed()}</SmallText>
              </SmallText>
            </Card>
          </Animated.View>

          {/* Achievement Message */}
          <Animated.View style={[animatedCardStyle, { marginTop: 8 }]}>
            <Card 
              variant="custom" 
              style={[
                styles.achievementCard, 
                { 
                  backgroundColor: theme.colors.success + '20', // 20% opacity
                  borderColor: theme.colors.success + '70', // 70% opacity
                }
              ]}
            >
              <View style={styles.achievementHeader}>
                <Icon name="ThumbsUp" size="action" color={theme.colors.primary} />
                <Heading3 style={styles.achievementTitle}>First Review Complete!</Heading3>
              </View>
              
              <BodyText style={styles.achievementText}>
                You're helping other golfers discover great courses. Continue reviewing to unlock personalized ratings and recommendations!
              </BodyText>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.background }]}>
                  <View 
                    style={[
                      styles.progressFilled, 
                      { backgroundColor: theme.colors.primary }
                    ]} 
                  />
                </View>
                <SmallText style={styles.progressText}>1 of 10 reviews to unlock ratings</SmallText>
              </View>
            </Card>
          </Animated.View>
        </View>

        {/* Next Steps Buttons */}
        <View style={styles.buttonsContainer}>
          <Button 
            variant="primary"
            label="Find Your Next Course"
            endIcon={<Icon name="ChevronRight" size="inline" color="white" />}
            onPress={handleFindNextCourse}
            disabled={buttonsDisabled}
            style={styles.primaryButton}
          />
          
          <Button 
            variant="tertiary"
            label="Go to Home"
            onPress={handleGoToHome}
            disabled={buttonsDisabled}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const { height, width } = Dimensions.get('window');
const compactLayout = height < 700; // Adjust layout for smaller screens

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  exitingContainer: {
    opacity: 0,
    transform: [{ translateY: 50 }],
  },
  contentContainer: {
    flex: 1,
  },
  exitingContent: {
    opacity: 0,
    transform: [{ scale: 0.95 }],
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    padding: 0,
    minWidth: 0,
  },
  header: {
    alignItems: 'center',
    marginTop: compactLayout ? 50 : (Platform.OS === 'ios' ? 50 : 36),
    marginBottom: compactLayout ? 24 : 32,
  },
  celebrationIcon: {
    marginBottom: compactLayout ? 8 : 12,
  },
  headerTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  centerContentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: compactLayout ? 8 : 10,
  },
  card: {
    padding: compactLayout ? 20 : 24,
    marginBottom: compactLayout ? 16 : 24,
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4.65,
    elevation: 5,
  },
  cardTitle: {
    marginBottom: 10,
    color: '#666',
    fontSize: 14,
  },
  courseContainer: {
    marginBottom: 14,
  },
  courseName: {
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
    marginLeft: 6,
    flex: 1,
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  dateLabel: {
    color: '#666',
  },
  dateValue: {
    fontWeight: '600',
  },
  achievementCard: {
    padding: compactLayout ? 20 : 24,
    marginBottom: compactLayout ? 16 : 24,
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4.65,
    elevation: 5,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  achievementTitle: {
    marginLeft: 12,
  },
  achievementText: {
    marginBottom: 18,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFilled: {
    width: '10%', // 1 out of 10 reviews
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 2,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    marginBottom: 14,
    width: '90%',
    maxWidth: 400,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    width: '90%',
    maxWidth: 400,
  },
}); 