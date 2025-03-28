import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, InputAccessoryView, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { ReviewScreenProps, SentimentRating } from '../../types/review';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { TagSelectionModal } from '../components/TagSelectionModal';
import { Tag, TAGS_BY_CATEGORY } from '../constants/tags';
import { ChevronRight } from 'lucide-react-native';
import { FavoriteHolesModal, FavoriteHole } from '../components/FavoriteHolesModal';
import { PlayingPartnersModal } from '../components/PlayingPartnersModal';
import { User } from '../../types';

const SENTIMENT_ICONS = {
  liked: '✅',
  fine: '🟡',
  didnt_like: '❌',
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
  const [favoriteHoles, setFavoriteHoles] = useState<FavoriteHole[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [datePlayed, setDatePlayed] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showFavoriteHolesModal, setShowFavoriteHolesModal] = useState(false);
  const [showPlayingPartnersModal, setShowPlayingPartnersModal] = useState(false);
  const [playingPartners, setPlayingPartners] = useState<User[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

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

    console.log('ReviewScreen: Starting review submission with data:', {
      course_id: course.id,
      course_name: course.name,
      rating,
      tags,
      notes,
      favorite_holes: favoriteHoles,
      photos: photos.length,
      date_played: datePlayed,
      playing_partners: playingPartners.map(p => p.id),
    });

    try {
      await onSubmit({
        course_id: course.id,
        rating,
        tags,
        notes,
        favorite_holes: favoriteHoles,
        photos,
        date_played: datePlayed,
        playing_partners: playingPartners.map(p => p.id),
      });
      console.log('ReviewScreen: Review submitted successfully');
    } catch (error) {
      console.error('ReviewScreen: Error submitting review:', error);
    }
  };

  const handleTagsSave = (selectedTags: Tag[]) => {
    setTags(selectedTags.map(tag => tag.id));
  };

  const getSelectedTagNames = () => {
    // Convert tag IDs back to names for display
    const tagNames = tags.map(tagId => {
      const allTags = Object.values(TAGS_BY_CATEGORY).flat();
      const tag = allTags.find(t => t.id === tagId);
      return tag ? tag.name : '';
    }).filter(Boolean);
    return tagNames.join(', ');
  };

  const getFavoriteHolesPreview = () => {
    if (favoriteHoles.length === 0) return '';
    const holeNumbers = favoriteHoles
      .sort((a, b) => a.number - b.number)
      .map(h => h.number)
      .join(', ');
    return `Holes ${holeNumbers}`;
  };

  const getPlayingPartnersPreview = () => {
    if (playingPartners.length === 0) return '';
    return playingPartners.map(p => p.name).join(', ');
  };

  // Generate a unique ID for the input accessory view
  const inputAccessoryViewID = 'notesInput';

  // Scroll to notes section when focused
  const handleNotesFocus = () => {
    // Use a small delay to ensure the keyboard has started to appear
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderBottomLeftRadius: theme.borderRadius.lg,
      borderBottomRightRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    courseName: {
      ...theme.typography.h2,
      marginBottom: theme.spacing.xs,
      color: '#ffffff',
      fontWeight: '700',
    },
    location: {
      ...theme.typography.body,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sectionTitle: {
      ...theme.typography.h3,
      marginBottom: theme.spacing.md,
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
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      width: '30%',
    },
    selectedSentiment: {
      backgroundColor: `${theme.colors.primary}20`,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    sentimentIcon: {
      fontSize: 28,
      marginBottom: theme.spacing.sm,
    },
    sentimentText: {
      ...theme.typography.body,
      fontWeight: '500',
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    photoThumbnail: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.md,
    },
    addPhotoButton: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.md,
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
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
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
    },
    submitButtonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
      marginRight: isSubmitting ? theme.spacing.sm : 0,
      fontSize: 16,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      minHeight: 120,
      color: theme.colors.text,
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      ...theme.typography.body,
    },
    keyboardAccessory: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    doneButton: {
      padding: theme.spacing.sm,
    },
    doneButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    selectorText: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    placeholderText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    dateRow: {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    dateText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '500',
    },
  });

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Course Header */}
        <View style={styles.header}>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.location}>{course.location}</Text>
        </View>

        {/* Sentiment Rating */}
        <View style={styles.sectionCard}>
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
                <Text style={styles.sentimentText}>{key.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <TouchableOpacity 
            style={styles.selectorRow}
            onPress={() => setShowTagsModal(true)}
            disabled={isSubmitting}
          >
            <Text style={tags.length > 0 ? styles.selectorText : styles.placeholderText}>
              {tags.length > 0 ? getSelectedTagNames() : 'Select course tags'}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Favorite Holes Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Favorite Holes</Text>
          <TouchableOpacity 
            style={styles.selectorRow}
            onPress={() => setShowFavoriteHolesModal(true)}
            disabled={isSubmitting}
          >
            <Text style={favoriteHoles.length > 0 ? styles.selectorText : styles.placeholderText}>
              {favoriteHoles.length > 0 ? getFavoriteHolesPreview() : 'Select your favorite holes'}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Add Playing Partners section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Who did you play with?</Text>
          <TouchableOpacity
            style={styles.selectorRow}
            onPress={() => setShowPlayingPartnersModal(true)}
            disabled={isSubmitting}
          >
            <Text style={playingPartners.length > 0 ? styles.selectorText : styles.placeholderText}>
              {playingPartners.length > 0 ? getPlayingPartnersPreview() : 'Select playing partners'}
            </Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Date Played */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Date Played</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
            disabled={isSubmitting}
          >
            <Text style={styles.dateText}>
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
        </View>

        {/* Notes Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Write about your experience..."
            placeholderTextColor={theme.colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
            inputAccessoryViewID={inputAccessoryViewID}
            onFocus={handleNotesFocus}
          />
        </View>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View style={styles.keyboardAccessory}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}

        {/* Photos */}
        <View style={styles.sectionCard}>
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

        <TagSelectionModal
          visible={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          onSave={handleTagsSave}
          selectedTags={tags.map(tagName => {
            const allTags = Object.values(TAGS_BY_CATEGORY).flat();
            return allTags.find(t => t.name === tagName)!;
          }).filter(Boolean)}
        />

        <FavoriteHolesModal
          visible={showFavoriteHolesModal}
          onClose={() => setShowFavoriteHolesModal(false)}
          onSave={setFavoriteHoles}
          selectedHoles={favoriteHoles}
          totalHoles={18}
        />

        <PlayingPartnersModal
          visible={showPlayingPartnersModal}
          onClose={() => setShowPlayingPartnersModal(false)}
          onSave={setPlayingPartners}
          selectedUsers={playingPartners}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}; 