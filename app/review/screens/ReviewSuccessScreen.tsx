import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { format, isValid } from 'date-fns';
import { useCourse } from '../../context/CourseContext';

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

  // Log component rendering for debugging
  useEffect(() => {
    console.log('🟢 ReviewSuccessScreen rendered with props:', {
      datePlayed: datePlayed?.toISOString(),
      rating,
      showRating,
      visitCount, // Log it but we won't display it
      course: course?.name
    });
  }, [datePlayed, rating, showRating, visitCount, course]);

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
    console.log('🔄 Navigating to search screen to review another course');
    // First close the current modal, then navigate to search
    router.replace('/(tabs)/search');
  };

  // Format the date safely
  const formatDatePlayed = () => {
    try {
      // Validate that the date is actually valid
      if (!datePlayed || !isValid(datePlayed)) {
        console.warn('⚠️ Invalid date provided to ReviewSuccessScreen:', datePlayed);
        return 'Recently';
      }
      return format(datePlayed, 'MMMM d, yyyy');
    } catch (error) {
      console.error('🔴 Error formatting date:', error);
      return 'Recently';
    }
  };

  // Custom theme for this screen based on requirements
  const customColors = {
    background: '#F8F5EC',
    primaryText: '#234D2C',
    secondaryText: '#4A5E50',
  };

  return (
    <View style={[styles.container, { backgroundColor: customColors.background }]}>
      {/* X button (Close) in top right corner */}
      <Pressable 
        style={styles.closeButton} 
        onPress={() => {
          console.log('❌ Close button pressed, navigating to lists');
          router.replace('/(tabs)/lists');
        }}
      >
        <Text style={[styles.closeButtonText, { color: customColors.primaryText }]}>✕</Text>
      </Pressable>

      <View style={styles.content}>
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

          {/* Message for users with less than 10 reviews */}
          {!showRating && (
            <View style={styles.unlockMessage}>
              <Text style={[styles.unlockText, { color: customColors.secondaryText }]}>
                Personalized ratings will be unlocked after reviewing 10 courses!
              </Text>
            </View>
          )}

          <Text style={[styles.datePlayed, { color: customColors.secondaryText }]}>
            <Text>Played on </Text>
            <Text>{formatDatePlayed()}</Text>
          </Text>

          {/* DEBUG INFO - Only visible in development */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>Review Count Threshold: {showRating ? '✅ 10+' : '❌ <10'}</Text>
              <Text style={styles.debugText}>Rating: {rating ? rating.toFixed(1) : 'None'}</Text>
              <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
              <Text style={styles.debugText}>Date: {datePlayed?.toISOString() || 'Invalid'}</Text>
            </View>
          )}
        </View>

        {/* Review Another Course Button */}
        <Pressable 
          style={[styles.reviewButton, { backgroundColor: customColors.primaryText }]}
          onPress={handleReviewAnother}
        >
          <Text style={styles.reviewButtonText}>Review Another Course</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  debugInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignSelf: 'stretch',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
}); 