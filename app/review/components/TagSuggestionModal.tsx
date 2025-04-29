import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { submitTagSuggestion } from '../../services/tagService';

interface TagSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TagSuggestionModal: React.FC<TagSuggestionModalProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const [tagName, setTagName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add debugging log when visibility changes
  useEffect(() => {
    console.log('DEBUG: TagSuggestionModal visibility changed to:', visible);
  }, [visible]);

  const handleSubmit = async () => {
    if (!tagName.trim()) {
      Alert.alert('Error', 'Please enter a tag idea');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitTagSuggestion({
        tagName: tagName.trim(),
      });
      
      Alert.alert(
        'Success',
        'Thank you for your suggestion!',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Error submitting tag suggestion:', error);
      Alert.alert('Error', 'There was a problem submitting your suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTagName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Request a tag
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            For all Eden members to use!
          </Text>
          
          <TextInput
            style={[styles.input, { 
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface
            }]}
            value={tagName}
            onChangeText={setTagName}
            placeholder="Tag idea"
            placeholderTextColor={theme.colors.textSecondary}
          />
          
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: '#0d6074' }]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleClose}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
}); 