import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

type Course = {
  id: string;
  name: string;
  location: string;
  type?: string;
  price_level?: string;
  average_rating?: number;
  total_reviews?: number;
  distance?: number;
  photo_url?: string;
};

interface CourseCardProps {
  course?: Course;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  loading = false,
  error,
  onRetry,
  style,
  testID = 'course-card',
}) => {
  const theme = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (course) {
      router.navigate({
        pathname: '/course/[id]',
        params: { id: course.id },
      });
    }
  };

  if (loading) {
    return (
      <View
        testID="course-card-skeleton"
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          style,
        ]}
      >
        <View style={styles.shimmerContainer}>
          <View style={[styles.shimmerImage, { backgroundColor: theme.colors.background }]} />
          <View style={styles.shimmerContent}>
            <View style={[styles.shimmerLine, { width: '80%', backgroundColor: theme.colors.background }]} />
            <View style={[styles.shimmerLine, { width: '60%', backgroundColor: theme.colors.background }]} />
            <View style={[styles.shimmerLine, { width: '40%', backgroundColor: theme.colors.background }]} />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        testID="course-card-error"
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          style,
        ]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          {onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={onRetry}
            >
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        style,
      ]}
      onPress={handlePress}
    >
      <View style={styles.contentContainer}>
        {course.photo_url ? (
          <Image
            source={{ uri: course.photo_url }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.colors.background }]}>
            <Text style={{ color: theme.colors.textSecondary }}>No image</Text>
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={[styles.location, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {course.location}
          </Text>
          <View style={styles.detailsContainer}>
            <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>
              ⭐️ {course.average_rating?.toFixed(1) || 'N/A'}
            </Text>
            <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>
              📝 {course.total_reviews || 0} reviews
            </Text>
            {course.distance !== undefined && (
              <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>
                {course.distance.toFixed(1)} mi
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detail: {
    fontSize: 12,
    marginRight: 12,
  },
  shimmerContainer: {
    flexDirection: 'row',
    padding: 12,
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
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 