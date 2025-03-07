import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { ReviewScreenProps, SentimentRating } from '../../types/review';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const SENTIMENT_ICONS = {
  liked: '✅',
  fine: '🟡',
  disliked: '❌',
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  course, 
  onSubmit,
  isSubmitting,
  error 
}) => {
  const theme = useTheme();
  const [rating, setRating] = useState<SentimentRating | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [favoriteHoles, setFavoriteHoles] = useState<number[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [datePlayed, setDatePlayed] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePhotoUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!rating || isSubmitting) return;

    await onSubmit({
      course_id: course.course_id,
      rating,
      tags,
      notes,
      favorite_holes: favoriteHoles,
      photos,
      date_played: datePlayed,
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    courseName: {
      ...theme.typography.h2,
      marginBottom: theme.spacing.xs,
      color: theme.colors.text,
    },
    location: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    section: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      ...theme.typography.h3,
      marginBottom: theme.spacing.sm,
      color: theme.colors.text,
    },
    sectionContent: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    sentimentContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    sentimentButton: {
      alignItems: 'center',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
    },
    selectedSentiment: {
      backgroundColor: theme.colors.primary + '20',
    },
    sentimentIcon: {
      fontSize: 24,
      marginBottom: theme.spacing.xs,
    },
    sentimentText: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    photoThumbnail: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.sm,
    },
    addPhotoButton: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    addPhotoText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
    },
    submitButton: {
      margin: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
    },
    submitButtonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
      marginRight: isSubmitting ? theme.spacing.sm : 0,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
  });

  return (
    <ScrollView style={styles.container}>
      {/* Course Header */}
      <View style={styles.header}>
        <Text style={styles.courseName}>{course.name}</Text>
        <Text style={styles.location}>{course.location}</Text>
      </View>

      {/* Sentiment Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How was your experience?</Text>
        <View style={styles.sentimentContainer}>
          {Object.entries(SENTIMENT_ICONS).map(([key, icon]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sentimentButton,
                rating === key && styles.selectedSentiment,
              ]}
              onPress={() => setRating(key as SentimentRating)}
              disabled={isSubmitting}
            >
              <Text style={styles.sentimentIcon}>{icon}</Text>
              <Text style={styles.sentimentText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Played */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => setShowDatePicker(true)}
        disabled={isSubmitting}
      >
        <Text style={styles.sectionTitle}>Date Played</Text>
        <Text style={styles.sectionContent}>
          {format(datePlayed, 'MMMM d, yyyy')}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={datePlayed}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDatePlayed(selectedDate);
            }
          }}
        />
      )}

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.photoThumbnail}
            />
          ))}
          {photos.length < 5 && !isSubmitting && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handlePhotoUpload}
            >
              <Text style={styles.addPhotoText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          (!rating || isSubmitting) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!rating || isSubmitting}
      >
        <Text style={styles.submitButtonText}>Submit Review</Text>
        {isSubmitting && <ActivityIndicator color={theme.colors.background} />}
      </TouchableOpacity>
    </ScrollView>
  );
}; 