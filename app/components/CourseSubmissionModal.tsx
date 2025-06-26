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
import { useEdenTheme } from '../theme/ThemeProvider';
import { submitCourseSubmission } from '../services/courseSubmissionService';

interface CourseSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  prefilledCourseName?: string;
}

export const CourseSubmissionModal: React.FC<CourseSubmissionModalProps> = ({
  visible,
  onClose,
  prefilledCourseName = '',
}) => {
  const theme = useEdenTheme();
  const [courseName, setCourseName] = useState('');
  const [state, setState] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCourseName(prefilledCourseName);
      setState('');
    }
  }, [visible, prefilledCourseName]);

  const handleSubmit = async () => {
    if (courseName.trim() === '' || state.trim() === '') {
      Alert.alert('Error', 'Please enter both course name and state');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitCourseSubmission({
        courseName: courseName.trim(),
        state: state.trim(),
      });
      
      Alert.alert(
        'Success',
        'Thank you for submitting this course! We\'ll review it and add it to our database.',
        [{ text: 'OK', onPress: () => onClose() }]
      );
    } catch (error) {
      console.error('Error submitting course:', error);
      Alert.alert('Error', 'There was a problem submitting your course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCourseName('');
    setState('');
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
            Submit Missing Course
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Help us grow our course database!
          </Text>
          
          <TextInput
            style={[styles.input, { 
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface
            }]}
            value={courseName}
            onChangeText={setCourseName}
            placeholder="Course Name"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
          />
          
          <TextInput
            style={[styles.input, { 
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface
            }]}
            value={state}
            onChangeText={setState}
            placeholder="State (e.g., California, TX, Florida)"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
          />
          
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Course'}
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
    fontSize: 24,
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
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  submitButton: {
    width: '100%',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 5,
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