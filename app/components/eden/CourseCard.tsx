import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEdenTheme } from '../../theme';
import { Card } from './Card';
import { Heading3, BodyText, SmallText } from './Typography';
import { Icon } from './Icon';

export interface Course {
  id: string;
  name: string;
  location: string;
  type?: string;
  price_level?: string;
  average_rating?: number;
  total_reviews?: number;
  distance?: number;
  photo_url?: string;
}

export interface CourseCardProps {
  /**
   * Course data to display
   */
  course?: Course;
  
  /**
   * Whether the card is in loading state
   */
  loading?: boolean;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Function to call when retry is pressed in error state
   */
  onRetry?: () => void;
  
  /**
   * Function to call when the card is pressed
   */
  onPress?: (course: Course) => void;
  
  /**
   * Additional style for the card
   */
  style?: ViewStyle;
  
  /**
   * Test ID for the card
   */
  testID?: string;
}

/**
 * CourseCard component built with Eden design system
 * Displays a golf course with image, name, location and details
 */
export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  loading = false,
  error,
  onRetry,
  onPress,
  style,
  testID = 'course-card',
}) => {
  const theme = useEdenTheme();
  const router = useRouter();
  
  // Handle card press
  const handlePress = () => {
    if (!course) return;
    
    if (onPress) {
      onPress(course);
    } else {
      router.navigate({
        pathname: '/course/[id]',
        params: { id: course.id },
      });
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <Card
        variant="course"
        testID="course-card-skeleton"
        style={style}
      >
        <View style={styles.shimmerContainer}>
          <View 
            style={[
              styles.shimmerImage, 
              { backgroundColor: theme.colors.border }
            ]} 
          />
          <View style={styles.shimmerContent}>
            <View 
              style={[
                styles.shimmerLine, 
                { width: '80%', backgroundColor: theme.colors.border }
              ]} 
            />
            <View 
              style={[
                styles.shimmerLine, 
                { width: '60%', backgroundColor: theme.colors.border }
              ]} 
            />
            <View 
              style={[
                styles.shimmerLine, 
                { width: '40%', backgroundColor: theme.colors.border }
              ]} 
            />
          </View>
        </View>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card
        variant="course"
        testID="course-card-error"
        style={style}
      >
        <View style={styles.errorContainer}>
          <BodyText color={theme.colors.error} center>
            {error}
          </BodyText>
          
          {onRetry && (
            <TouchableOpacity
              style={[
                styles.retryButton, 
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={onRetry}
            >
              <SmallText color={theme.colors.text.inverse}>
                Retry
              </SmallText>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  }
  
  // If no course, don't render anything
  if (!course) {
    return null;
  }
  
  return (
    <Card
      variant="course"
      pressable
      onPress={handlePress}
      style={style}
      testID={testID}
    >
      <View style={styles.contentContainer}>
        {course.photo_url ? (
          <Image
            source={{ uri: course.photo_url }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[
            styles.placeholderImage, 
            { backgroundColor: theme.colors.border }
          ]}>
            <Icon 
              name="Golf" 
              size="navigation"
              color={theme.colors.textSecondary}
            />
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <Heading3 numberOfLines={1}>
            {course.name}
          </Heading3>
          
          <SmallText color={theme.colors.textSecondary} numberOfLines={1}>
            {course.location}
          </SmallText>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Icon 
                name="Star" 
                size="inline" 
                color={theme.colors.warning}
              />
              <SmallText color={theme.colors.textSecondary}>
                {course.average_rating?.toFixed(1) || 'N/A'}
              </SmallText>
            </View>
            
            <View style={styles.detailItem}>
              <Icon 
                name="ClipboardList" 
                size="inline" 
                color={theme.colors.textSecondary}
              />
              <SmallText color={theme.colors.textSecondary}>
                {course.total_reviews || 0} reviews
              </SmallText>
            </View>
            
            {course.distance !== undefined && (
              <View style={styles.detailItem}>
                <Icon 
                  name="MapPin" 
                  size="inline" 
                  color={theme.colors.textSecondary}
                />
                <SmallText color={theme.colors.textSecondary}>
                  {course.distance.toFixed(1)} mi
                </SmallText>
              </View>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  shimmerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shimmerImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  shimmerContent: {
    flex: 1,
    marginLeft: 12,
  },
  shimmerLine: {
    height: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
}); 