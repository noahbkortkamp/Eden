import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { format, isValid } from 'date-fns';
import { useCourse } from '../../context/CourseContext';
import { Award, ChevronRight, Locate, Star, ThumbsUp } from 'lucide-react-native';

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
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { course } = useCourse();

  // Get course info from props or context
  const displayCourseName = courseName || course?.name || 'your course';
  const displayCourseLocation = courseLocation || course?.location || '';

  // Format the date safely
  const formatDatePlayed = () => {
    try {
      // Validate that the date is actually valid
      if (!datePlayed || !isValid(datePlayed)) {
        return 'Recently';
      }
      return format(datePlayed, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };

  const handleFindNextCourse = () => {
    console.log('🔄 Navigating to search screen to find next course');
    router.replace('/(tabs)/search');
  };

  const handleGoToHome = () => {
    console.log('🏠 Navigating to main app');
    router.replace('/(tabs)');
  };

  // Custom theme for this screen
  const customColors = {
    background: '#f7f9f7',
    primaryText: '#234D2C',
    secondaryText: '#4A5E50',
    accentColor: '#e6f7ee',
    accentBorder: '#9cd9b3',
  };

  return (
    <View style={[styles.container, { backgroundColor: customColors.background }]}>
      {/* Header with confetti/celebration imagery */}
      <View style={styles.header}>
        <Award size={64} color="#234D2C" style={styles.celebrationIcon} />
        <Text style={styles.headerTitle}>You did it!</Text>
        <Text style={styles.headerSubtitle}>Your first course review is complete!</Text>
      </View>

      {/* Course Review Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>You reviewed:</Text>
        
        <View style={styles.courseContainer}>
          <Text style={styles.courseName}>{displayCourseName}</Text>
          
          {displayCourseLocation && (
            <View style={styles.locationContainer}>
              <Locate size={14} color="#666" />
              <Text style={styles.courseLocation}>{displayCourseLocation}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.dateLabel}>
          <Text style={styles.dateLabelText}>Played on </Text>
          <Text style={styles.dateValue}>{formatDatePlayed()}</Text>
        </Text>
      </View>

      {/* Achievement Message */}
      <View style={styles.achievementCard}>
        <View style={styles.achievementHeader}>
          <ThumbsUp size={24} color="#234D2C" />
          <Text style={styles.achievementTitle}>First Review Complete!</Text>
        </View>
        
        <Text style={styles.achievementText}>
          You're helping other golfers discover great courses. Continue reviewing to unlock personalized ratings and recommendations!
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFilled} />
          </View>
          <Text style={styles.progressText}>1 of 10 reviews to unlock ratings</Text>
        </View>
      </View>

      {/* Next Steps Buttons */}
      <View style={styles.buttonsContainer}>
        <Pressable 
          style={styles.primaryButton}
          onPress={handleFindNextCourse}
        >
          <Text style={styles.primaryButtonText}>Find Your Next Course</Text>
          <ChevronRight size={20} color="#fff" />
        </Pressable>
        
        <Pressable 
          style={styles.secondaryButton}
          onPress={handleGoToHome}
        >
          <Text style={styles.secondaryButtonText}>Go to Home</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 30,
  },
  celebrationIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#234D2C',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#4A5E50',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  courseContainer: {
    marginBottom: 16,
  },
  courseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#234D2C',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateLabelText: {
    fontWeight: 'normal',
  },
  dateValue: {
    fontWeight: '600',
  },
  achievementCard: {
    backgroundColor: '#e6f7ee',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#9cd9b3',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#234D2C',
    marginLeft: 10,
  },
  achievementText: {
    fontSize: 16,
    color: '#234D2C',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#d1e7d9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFilled: {
    width: '10%', // 1 out of 10 reviews
    height: '100%',
    backgroundColor: '#234D2C',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#4A5E50',
    textAlign: 'center',
  },
  buttonsContainer: {
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  primaryButton: {
    backgroundColor: '#234D2C',
    borderRadius: 50,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  secondaryButton: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#234D2C',
    fontSize: 16,
    fontWeight: '600',
  },
}); 