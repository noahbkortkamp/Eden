import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, InputAccessoryView, Keyboard, Platform, KeyboardAvoidingView, Pressable, Modal, KeyboardEvent, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, useEdenTheme } from '../../theme/ThemeProvider';
import { ReviewScreenProps, SentimentRating } from '../../types/review';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { TagSelectionModal } from '../components/TagSelectionModal';
import { Tag } from '../constants/tags';
import { ChevronRight, Check, Minus, X } from 'lucide-react-native';
import { FavoriteHolesModal, FavoriteHole } from '../components/FavoriteHolesModal';
import { PlayingPartnersModal } from '../components/PlayingPartnersModal';
import { User } from '../../types';
import { Heading2, Heading3, BodyText, SmallText } from '../../components/eden/Typography';
import { getAllTags } from '../../utils/reviews';

// Sentiment rating options with their corresponding icons
const SENTIMENT_ICONS = {
  liked: <Check size={24} color="#234D2C" />,
  fine: <Minus size={24} color="#4A5E50" />,
  didnt_like: <X size={24} color="#4A5E50" />,
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  course, 
  onSubmit,
  isSubmitting,
  error 
}) => {
  const theme = useTheme();
  const edenTheme = useEdenTheme();
  const [rating, setRating] = useState<SentimentRating | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [localSelectedTags, setLocalSelectedTags] = useState<Tag[]>([]);
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

  // Sync tags with localSelectedTags if tags are passed in externally
  useEffect(() => {
    if (tags.length > 0 && localSelectedTags.length === 0) {
      // If we have tags but no localSelectedTags, we need to fetch the tag details
      const fetchTagDetails = async () => {
        try {
          const allTags = await getAllTags();
          const foundTags = tags
            .map(tagId => allTags.find(t => t.id === tagId))
            .filter((tag): tag is Tag => tag !== undefined);
          setLocalSelectedTags(foundTags);
        } catch (error) {
          console.error("Error loading tag details:", error);
        }
      };
      
      fetchTagDetails();
    }
  }, [tags, localSelectedTags]);

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
    // Save the full tag objects for the modal
    setLocalSelectedTags(selectedTags);
    // Save just the tag IDs for submission
    setTags(selectedTags.map(tag => tag.id));
  };

  const getSelectedTagNames = () => {
    // Just return the names of the selected tags from localSelectedTags
    const tagNames = localSelectedTags.map(tag => tag.name);

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
      backgroundColor: edenTheme.colors.background,
    },
    header: {
      padding: edenTheme.spacing.md,
      paddingBottom: edenTheme.spacing.lg,
      backgroundColor: edenTheme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: edenTheme.colors.border,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: edenTheme.colors.border,
    },
    section: {
      padding: edenTheme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: edenTheme.colors.border,
    },
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: edenTheme.spacing.sm,
      paddingHorizontal: edenTheme.spacing.md,
    },
    sentimentContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: edenTheme.spacing.md,
      marginBottom: edenTheme.spacing.md,
      gap: edenTheme.spacing.sm,
    },
    sentimentButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 110,
      height: 80,
      borderRadius: edenTheme.borderRadius.lg,
      paddingVertical: edenTheme.spacing.sm,
      paddingHorizontal: edenTheme.spacing.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    selectedSentiment: {
      borderWidth: 2,
      borderColor: edenTheme.colors.primary,
    },
    sentimentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: edenTheme.spacing.xs,
    },
    sentimentIconLiked: {
      backgroundColor: edenTheme.colors.liked,
    },
    sentimentIconFine: {
      backgroundColor: edenTheme.colors.neutral,
    },
    sentimentIconDisliked: {
      backgroundColor: edenTheme.colors.disliked,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: edenTheme.colors.border,
      borderRadius: edenTheme.borderRadius.md,
      padding: edenTheme.spacing.sm,
      minHeight: 60,
      marginTop: edenTheme.spacing.sm,
      color: edenTheme.colors.text,
      backgroundColor: edenTheme.colors.surface,
    },
    keyboardAccessory: {
      backgroundColor: edenTheme.colors.surface,
      padding: edenTheme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: edenTheme.colors.border,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    doneButton: {
      padding: edenTheme.spacing.sm,
    },
    doneButtonText: {
      color: edenTheme.colors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    submitButton: {
      marginHorizontal: edenTheme.spacing.md,
      marginTop: edenTheme.spacing.md,
      marginBottom: edenTheme.spacing.md,
      padding: edenTheme.spacing.md,
      backgroundColor: edenTheme.colors.primary,
      borderRadius: edenTheme.borderRadius.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: edenTheme.colors.textSecondary,
    },
    submitButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
      marginRight: isSubmitting ? 8 : 0,
    },
    errorText: {
      color: edenTheme.colors.error,
      textAlign: 'center',
      marginTop: edenTheme.spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    datePickerContainer: {
      backgroundColor: edenTheme.colors.surface,
      borderTopLeftRadius: edenTheme.borderRadius.lg,
      borderTopRightRadius: edenTheme.borderRadius.lg,
      paddingBottom: 20,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: edenTheme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: edenTheme.colors.border,
    },
    datePickerCancel: {
      color: edenTheme.colors.primary,
      fontSize: 16,
    },
    datePickerDone: {
      color: edenTheme.colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    datePicker: {
      height: 250,
    },
    fieldValue: {
      color: edenTheme.colors.textSecondary,
      marginLeft: 'auto',
      fontSize: 15,
    },
    fieldLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

  // Sentiment labels
  const sentimentLabels = {
    liked: 'I like it',
    fine: 'It was fine',
    didnt_like: "Didn't like it"
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
          <Heading2>{course.name}</Heading2>
        </View>

        {/* Sentiment Rating */}
        <View style={[styles.section, { paddingBottom: edenTheme.spacing.sm }]}>
          <Heading3 style={{ marginBottom: edenTheme.spacing.md }}>What did you think of the course?</Heading3>
          <View style={styles.sentimentContainer}>
            {Object.keys(SENTIMENT_ICONS).map((key) => {
              const isSelected = rating === key;
              let backgroundColor;
              switch(key) {
                case 'liked':
                  backgroundColor = edenTheme.colors.liked;
                  break;
                case 'fine':
                  backgroundColor = edenTheme.colors.neutral;
                  break;
                case 'didnt_like':
                  backgroundColor = edenTheme.colors.disliked;
                  break;
                default:
                  backgroundColor = edenTheme.colors.surface;
              }
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sentimentButton,
                    { backgroundColor },
                    isSelected && styles.selectedSentiment,
                  ]}
                  onPress={() => setRating(key as SentimentRating)}
                  disabled={isSubmitting}
                >
                  <View style={{ marginBottom: edenTheme.spacing.xs }}>
                    {SENTIMENT_ICONS[key as SentimentRating]}
                  </View>
                  <BodyText bold={isSelected} style={{ fontSize: 13 }}>
                    {sentimentLabels[key as SentimentRating]}
                  </BodyText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Only show the following sections if a sentiment rating has been selected */}
        {rating && (
          <>
            <View style={styles.sectionDivider} />

            {/* Tags Section */}
            <TouchableOpacity
              style={styles.rowContainer}
              onPress={() => setShowTagsModal(true)}
              disabled={isSubmitting}
            >
              <BodyText bold>Tags</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SmallText style={styles.fieldValue}>
                  {tags.length > 0 ? getSelectedTagNames() : 'Select tags'}
                </SmallText>
                <ChevronRight size={16} color={edenTheme.colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionDivider} />

            {/* Favorite Holes Section */}
            <TouchableOpacity
              style={styles.rowContainer}
              onPress={() => setShowFavoriteHolesModal(true)}
              disabled={isSubmitting}
            >
              <BodyText bold>Favorite Holes</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SmallText style={styles.fieldValue}>
                  {favoriteHoles.length > 0 ? getFavoriteHolesPreview() : 'Add holes'}
                </SmallText>
                <ChevronRight size={16} color={edenTheme.colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionDivider} />

            {/* Playing Partners Section */}
            <TouchableOpacity
              style={styles.rowContainer}
              onPress={() => setShowPlayingPartnersModal(true)}
              disabled={isSubmitting}
            >
              <BodyText bold>Playing Partners</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SmallText style={styles.fieldValue}>
                  {playingPartners.length > 0 ? getPlayingPartnersPreview() : 'Select partners'}
                </SmallText>
                <ChevronRight size={16} color={edenTheme.colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionDivider} />

            {/* Photos Section */}
            <TouchableOpacity
              style={styles.rowContainer}
              onPress={handlePhotoUpload}
              disabled={isSubmitting}
            >
              <BodyText bold>Photos</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SmallText style={styles.fieldValue}>
                  {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Add Photos'}
                </SmallText>
                <ChevronRight size={16} color={edenTheme.colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionDivider} />

            {/* Date Played Section */}
            <TouchableOpacity
              style={styles.rowContainer}
              onPress={openDatePicker}
              disabled={isSubmitting}
            >
              <BodyText bold>Date Played</BodyText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SmallText style={styles.fieldValue}>
                  {format(datePlayed, 'MMMM d, yyyy')}
                </SmallText>
                <ChevronRight size={16} color={edenTheme.colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionDivider} />

            {/* Notes Section */}
            <View style={[styles.section, { paddingBottom: edenTheme.spacing.lg }]}>
              <BodyText bold style={{ marginBottom: edenTheme.spacing.sm }}>Notes</BodyText>
              <TextInput
                ref={notesInputRef}
                style={styles.notesInput}
                multiline
                placeholder="Write about your experience..."
                placeholderTextColor={edenTheme.colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                onFocus={handleNotesFocus}
                inputAccessoryViewID={inputAccessoryViewID}
                maxLength={500}
                returnKeyType="done"
                blurOnSubmit={true}
                disabled={isSubmitting}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!rating || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!rating || isSubmitting}
            >
              <BodyText style={styles.submitButtonText}>Submit</BodyText>
              {isSubmitting && <ActivityIndicator color="white" size="small" />}
            </TouchableOpacity>

            {error && <SmallText style={styles.errorText}>{error}</SmallText>}
          </>
        )}
      </ScrollView>

      {/* Input Accessory View (iOS only) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity style={styles.doneButton} onPress={() => Keyboard.dismiss()}>
              <SmallText style={styles.doneButtonText}>Done</SmallText>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      {/* Date Picker Modal (iOS) */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <SmallText style={styles.datePickerCancel}>Cancel</SmallText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <SmallText style={styles.datePickerDone}>Done</SmallText>
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
                maximumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}
      
      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={datePlayed}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDatePlayed(selectedDate);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {/* Tag Selection Modal */}
      <TagSelectionModal
        visible={showTagsModal}
        onClose={() => setShowTagsModal(false)}
        onSave={handleTagsSave}
        selectedTags={localSelectedTags}
      />

      {/* Favorite Holes Modal */}
      <FavoriteHolesModal
        visible={showFavoriteHolesModal}
        onClose={() => setShowFavoriteHolesModal(false)}
        onSave={(holes) => setFavoriteHoles(holes)}
        selectedHoles={favoriteHoles}
        totalHoles={18}
      />

      {/* Playing Partners Modal */}
      <PlayingPartnersModal
        visible={showPlayingPartnersModal}
        onClose={() => setShowPlayingPartnersModal(false)}
        onSave={(partners) => setPlayingPartners(partners)}
        selectedUsers={playingPartners}
      />
    </KeyboardAvoidingView>
  );
}; 