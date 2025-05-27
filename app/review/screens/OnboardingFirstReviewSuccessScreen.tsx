import React from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isValid } from 'date-fns';
import { useEdenTheme } from '../../theme';

// Import Eden Design System components
import {
  Heading1,
  Heading3,
  BodyText,
  SmallText,
  Button,
  Card,
  Icon,
  Divider,
} from '../../components/eden';

interface OnboardingFirstReviewSuccessProps {
  courseName: string;
  courseLocation?: string;
  datePlayed: Date;
}

export const OnboardingFirstReviewSuccessScreen: React.FC<OnboardingFirstReviewSuccessProps> = ({
  courseName,
  courseLocation,
  datePlayed,
}) => {
  // Add debug logging
  console.log('OnboardingFirstReviewSuccessScreen rendered with props:', {
    courseName,
    courseLocation,
    datePlayed: datePlayed ? datePlayed.toISOString() : 'null'
  });
  
  // Add component lifecycle logging
  React.useEffect(() => {
    console.log('🏆 OnboardingFirstReviewSuccessScreen mounted');
    
    return () => {
      console.log('🏆 OnboardingFirstReviewSuccessScreen unmounted');
    };
  }, []);
  
  // All hooks at the top level - no conditions
  const theme = useEdenTheme();
  const router = useRouter();
  
  // Track if navigation is in progress to prevent multiple clicks
  const isNavigating = React.useRef(false);
  
  // Helper function to format date safely
  const formatDatePlayed = () => {
    try {
      // Validate the date first
      if (!datePlayed || !isValid(datePlayed)) {
        console.warn('Invalid date provided to OnboardingFirstReviewSuccessScreen', datePlayed);
        return 'Recently';
      }
      
      // Format with proper error handling
      return format(datePlayed, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Date formatting error:', error);
      // Return a safe fallback
      return 'Recently';
    }
  };

  // Memoize navigation handlers to prevent recreating on each render
  const handleFindNextCourse = React.useCallback(() => {
    // Prevent multiple navigation attempts
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    try {
      console.log('🏆 Navigating to search tab from success screen');
      
      // Faster transition - reduce delay times
      router.replace('/(tabs)');
      
      // Then navigate to search with minimal delay
      setTimeout(() => {
        router.replace('/(tabs)/search');
        console.log('🏆 Successfully navigated to search tab');
        // Reset navigation flag after completion
        isNavigating.current = false;
      }, 50); // Reduced from 400ms to 50ms
    } catch (err) {
      console.error('Error navigating to search tab:', err);
      // Ultimate fallback - immediate execution
      router.replace('/(tabs)');
      isNavigating.current = false;
    }
  }, [router]);

  const handleGoToHome = React.useCallback(() => {
    // Prevent multiple navigation attempts
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    try {
      console.log('🏆 Navigating to lists tab from success screen');
      
      // Direct navigation without unnecessary delays
      router.replace('/(tabs)/lists');
      console.log('🏆 Successfully navigated to lists tab');
      // Reset navigation flag immediately
      isNavigating.current = false;
    } catch (err) {
      console.error('Error navigating to lists tab:', err);
      // Fallback with minimal delay
      router.replace('/(tabs)');
      isNavigating.current = false;
    }
  }, [router]);
  
  const handleClose = React.useCallback(() => {
    // Prevent multiple navigation attempts
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    try {
      console.log('🏆 Closing success screen and navigating to lists tab');
      
      // Direct navigation without unnecessary delays
      router.replace('/(tabs)/lists');
      console.log('🏆 Successfully closed success screen');
      // Reset navigation flag immediately
      isNavigating.current = false;
    } catch (err) {
      console.error('Error closing success screen:', err);
      // Fallback with minimal delay
      router.replace('/(tabs)');
      isNavigating.current = false;
    }
  }, [router]);
  
  // For safety, wrap the return in a try/catch
  try {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Close Button */}
        <Button
          variant="tertiary"
          onPress={handleClose}
          style={styles.closeButton}
          startIcon={<Icon name="X" size="action" />}
          iconOnly
        />
        
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Header with celebration icon */}
          <View style={styles.header}>
            <Icon name="Award" size="hero" color={theme.colors.primary} style={styles.celebrationIcon} />
            <Heading1 style={styles.headerTitle}>You did it!</Heading1>
            <BodyText style={styles.headerSubtitle}>Your first course review is complete!</BodyText>
          </View>

          {/* Center content container */}
          <View style={styles.centerContentContainer}>
            {/* Course Review Card */}
            <Card variant="default" style={styles.card}>
              <SmallText style={styles.cardTitle}>You reviewed:</SmallText>
              
              <View style={styles.courseContainer}>
                <Heading3 style={styles.courseName} numberOfLines={1}>{courseName}</Heading3>
                
                {courseLocation && (
                  <View style={styles.locationContainer}>
                    <Icon name="MapPin" size="inline" color={theme.colors.textSecondary} />
                    <SmallText style={styles.courseLocation} numberOfLines={1}>{courseLocation}</SmallText>
                  </View>
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              <SmallText style={styles.dateLabel}>
                Played on <SmallText style={styles.dateValue}>{formatDatePlayed()}</SmallText>
              </SmallText>
            </Card>

            {/* Achievement Message */}
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
                <Icon name="Award" size="action" color={theme.colors.primary} />
                <Heading3 style={styles.achievementTitle}>Unlock Personalized Rankings</Heading3>
              </View>
              
              <BodyText style={styles.achievementText}>
                Continue reviewing courses you've played to unlock our personalized rating system and recommendations!
              </BodyText>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.background }]}>
                  <View 
                    style={[
                      styles.progressFilled, 
                      { backgroundColor: theme.colors.primary, width: '10%' } // 1 of 10 reviews
                    ]} 
                  />
                </View>
                <SmallText style={styles.progressText}>1 of 10 reviews to unlock ratings</SmallText>
              </View>
            </Card>
          </View>

          {/* Next Steps Buttons */}
          <View style={styles.buttonsContainer}>
            <Button 
              variant="primary"
              label="Review Your Next Course"
              endIcon={<Icon name="ChevronRight" size="inline" color="white" />}
              onPress={handleFindNextCourse}
              style={styles.primaryButton}
            />
            
            <Button 
              variant="tertiary"
              label="Go to Home"
              onPress={handleGoToHome}
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  } catch (error) {
    console.error('Error rendering OnboardingFirstReviewSuccessScreen:', error);
    // Return a minimal fallback UI
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>First review completed!</Text>
        <Button 
          variant="primary"
          label="Continue"
          onPress={() => router.replace('/(tabs)/lists')}
          style={{ width: 200 }}
        />
      </SafeAreaView>
    );
  }
};

// Styles outside the component to avoid recreation on each render
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 32,
  },
  celebrationIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  centerContentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  card: {
    padding: 24,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
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
    padding: 24,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
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
    marginBottom: 24,
  },
  primaryButton: {
    marginBottom: 16,
    width: 'auto',
    minWidth: 240,
    maxWidth: 320,
    alignSelf: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 400,
  },
}); 