import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, InputAccessoryView, Keyboard, Platform, KeyboardAvoidingView, Pressable, Modal, KeyboardEvent, Dimensions } from 'react-native';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const notesInputRef = useRef<TextInput>(null);

  // Listen for keyboard events to get accurate keyboard height
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

    if (tagNames.length <= 3) {
      return tagNames.join(', ');
    }
    return `${tagNames.slice(0, 3).join(', ')} ...`;
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

  // Improved scroll to notes section when focused
  const handleNotesFocus = () => {
    setTimeout(() => {
      // For iOS, use measureInWindow to get the absolute position
      if (Platform.OS === 'ios' && notesInputRef.current) {
        notesInputRef.current.measureInWindow((x, y, width, height) => {
          const screenHeight = Dimensions.get('window').height;
          if (y + height > screenHeight - keyboardHeight - 50) {
            // If the input would be covered by keyboard, scroll to make it visible
            scrollViewRef.current?.scrollTo({
              y: y - 150, // Add extra padding at the top
              animated: true,
            });
          }
        });
      } else {
        // For Android or fallback, just scroll to a position that works
        scrollViewRef.current?.scrollTo({ 
          y: 500, // Approximate position of notes
          animated: true 
        });
      }
    }, 150);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      // On iOS, we'll use our own modal to show the date picker
      setShowDatePicker(true);
    } else {
      // On Android, the DateTimePicker works as expected
      setShowDatePicker(true);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 12,
      paddingBottom: 14,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    courseName: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.text,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
    },
    section: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.colors.text,
    },
    labelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    valueText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      marginLeft: 'auto',
    },
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    sentimentContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
      marginBottom: 6,
    },
    sentimentButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 70,
      height: 70,
      borderRadius: 4,
      paddingVertical: 6,
    },
    selectedSentiment: {
      backgroundColor: 'rgba(0, 122, 255, 0.08)',
      borderWidth: 1.5,
      borderColor: '#007AFF',
      borderRadius: 8,
    },
    sentimentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    sentimentIconLiked: {
      backgroundColor: '#E8F5E9',
    },
    sentimentIconFine: {
      backgroundColor: '#FFF8E1',
    },
    sentimentIconDisliked: {
      backgroundColor: '#FFEBEE',
    },
    iconText: {
      fontSize: 20,
      textAlign: 'center',
    },
    sentimentText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginTop: 2,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 10,
      minHeight: 60,
      marginTop: 8,
      color: theme.colors.text,
    },
    keyboardAccessory: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    doneButton: {
      padding: 8,
    },
    doneButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    submitButton: {
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
    },
    submitButtonText: {
      color: theme.colors.background,
      fontWeight: '600',
      fontSize: 16,
      marginRight: isSubmitting ? 8 : 0,
    },
    errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    datePickerContainer: {
      backgroundColor: 'white',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingBottom: 20,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eeeeee',
    },
    datePickerCancel: {
      color: '#007AFF',
      fontSize: 16,
    },
    datePickerDone: {
      color: '#007AFF',
      fontSize: 16,
      fontWeight: '600',
    },
    datePicker: {
      height: 250,
    },
  });

  const renderSentimentIcon = (type: SentimentRating) => {
    switch (type) {
      case 'liked':
        return (
          <View style={[styles.sentimentIcon, styles.sentimentIconLiked]}>
            <Text style={styles.iconText}>✓</Text>
          </View>
        );
      case 'fine':
        return (
          <View style={[styles.sentimentIcon, styles.sentimentIconFine]}>
            <Text style={styles.iconText}>—</Text>
          </View>
        );
      case 'didnt_like':
        return (
          <View style={[styles.sentimentIcon, styles.sentimentIconDisliked]}>
            <Text style={[styles.iconText, { fontWeight: '800' }]}>✕</Text>
          </View>
        );
    }
  };

  const sentimentLabels = {
    liked: 'Liked',
    fine: 'Fine',
    didnt_like: "Didn't Like"
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 30}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: keyboardHeight > 0 ? keyboardHeight : 10,
        }}
      >
        {/* Course Header */}
        <View style={styles.header}>
          <Text style={styles.courseName}>{course.name}</Text>
        </View>

        {/* Sentiment Rating */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.sentimentContainer}>
            {Object.keys(SENTIMENT_ICONS).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.sentimentButton,
                  rating === key && [
                    styles.selectedSentiment,
                    key === 'didnt_like' && { backgroundColor: 'rgba(0, 122, 255, 0.04)' }
                  ]
                ]}
                onPress={() => setRating(key as SentimentRating)}
                disabled={isSubmitting}
              >
                {renderSentimentIcon(key as SentimentRating)}
                <Text style={styles.sentimentText}>
                  {sentimentLabels[key as SentimentRating]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Tags Section */}
        <TouchableOpacity
          style={styles.rowContainer}
          onPress={() => setShowTagsModal(true)}
          disabled={isSubmitting}
        >
          <Text style={styles.labelText}>Tags</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.valueText}>
              {tags.length > 0 ? getSelectedTagNames() : 'Select tags'}
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        {/* Favorite Holes Section */}
        <TouchableOpacity
          style={styles.rowContainer}
          onPress={() => setShowFavoriteHolesModal(true)}
          disabled={isSubmitting}
        >
          <Text style={styles.labelText}>Favorite Holes</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.valueText}>
              {favoriteHoles.length > 0 ? getFavoriteHolesPreview() : 'Add holes'}
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        {/* Playing Partners Section */}
        <TouchableOpacity
          style={styles.rowContainer}
          onPress={() => setShowPlayingPartnersModal(true)}
          disabled={isSubmitting}
        >
          <Text style={styles.labelText}>Playing Partners</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.valueText}>
              {playingPartners.length > 0 ? getPlayingPartnersPreview() : 'Select partners'}
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        {/* Photos Section */}
        <TouchableOpacity
          style={styles.rowContainer}
          onPress={handlePhotoUpload}
          disabled={isSubmitting}
        >
          <Text style={styles.labelText}>Photos</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.valueText}>
              {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Add Photos'}
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        {/* Date Section */}
        <View style={styles.rowContainer}>
          <Text style={styles.labelText}>Date Played</Text>
          <Pressable
            onPress={openDatePicker}
            disabled={isSubmitting}
            style={({ pressed }) => [
              { 
                flexDirection: 'row', 
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
                paddingVertical: 6,
                paddingHorizontal: 8,
              }
            ]}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.valueText}>
              {format(datePlayed, 'MMMM d, yyyy')}
            </Text>
            <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>

        <View style={styles.sectionDivider} />
        
        {/* Notes Section - Minimized height */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <Text style={styles.labelText}>Notes</Text>
          <TextInput
            ref={notesInputRef}
            style={styles.notesInput}
            placeholder="Write about your experience..."
            placeholderTextColor={theme.colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isSubmitting}
            inputAccessoryViewID={inputAccessoryViewID}
            onFocus={handleNotesFocus}
            blurOnSubmit={false}
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

        {/* iOS-specific date picker */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal
            transparent={true}
            visible={showDatePicker}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setShowDatePicker(false)}
            >
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={datePlayed}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDatePlayed(selectedDate);
                    }
                  }}
                  style={styles.datePicker}
                />
              </View>
            </Pressable>
          </Modal>
        )}

        {/* Android date picker */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={datePlayed}
            mode="date"
            display="calendar"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDatePlayed(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.sectionDivider} />

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
          <Text style={styles.submitButtonText}>Submit</Text>
          {isSubmitting && <ActivityIndicator color={theme.colors.background} />}
        </TouchableOpacity>

        <TagSelectionModal
          visible={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          onSave={handleTagsSave}
          selectedTags={tags.map(tagId => {
            const allTags = Object.values(TAGS_BY_CATEGORY).flat();
            return allTags.find(t => t.id === tagId);
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