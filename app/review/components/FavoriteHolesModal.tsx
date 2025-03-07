import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  InputAccessoryView,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { X } from 'lucide-react-native';

export interface FavoriteHole {
  number: number;
  reason: string;
}

interface FavoriteHolesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (favoriteHoles: FavoriteHole[]) => void;
  selectedHoles: FavoriteHole[];
  totalHoles?: number;
}

export const FavoriteHolesModal: React.FC<FavoriteHolesModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedHoles,
  totalHoles = 18,
}) => {
  const theme = useTheme();
  const [localSelectedHoles, setLocalSelectedHoles] = React.useState<FavoriteHole[]>(selectedHoles);

  // Generate a unique ID for the input accessory view
  const inputAccessoryViewID = 'holeReasonInput';

  React.useEffect(() => {
    setLocalSelectedHoles(selectedHoles);
  }, [selectedHoles]);

  const toggleHole = (holeNumber: number) => {
    setLocalSelectedHoles((prev) => {
      const isSelected = prev.some((h) => h.number === holeNumber);
      if (isSelected) {
        return prev.filter((h) => h.number !== holeNumber);
      }
      return [...prev, { number: holeNumber, reason: '' }];
    });
  };

  const updateHoleReason = (holeNumber: number, reason: string) => {
    setLocalSelectedHoles((prev) =>
      prev.map((hole) =>
        hole.number === holeNumber ? { ...hole, reason } : hole
      )
    );
  };

  const handleSave = () => {
    onSave(localSelectedHoles);
    onClose();
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    holesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    holeButton: {
      width: 50,
      height: 50,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    holeButtonSelected: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
    },
    holeNumber: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    holeNumberSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    reasonsContainer: {
      marginTop: theme.spacing.md,
    },
    reasonsTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    reasonItem: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    reasonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    reasonHoleNumber: {
      ...theme.typography.h4,
      color: theme.colors.text,
    },
    reasonInput: {
      ...theme.typography.body,
      color: theme.colors.text,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
    },
    saveButton: {
      margin: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    saveButtonText: {
      ...theme.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    keyboardAccessory: {
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: '#ccc',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    doneButton: {
      padding: 8,
    },
    doneButtonText: {
      fontWeight: '600',
      fontSize: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Favorite Holes</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Hole Selection Grid */}
          <View style={styles.holesGrid}>
            {Array.from({ length: totalHoles }, (_, i) => i + 1).map((holeNumber) => {
              const isSelected = localSelectedHoles.some((h) => h.number === holeNumber);
              return (
                <TouchableOpacity
                  key={holeNumber}
                  style={[
                    styles.holeButton,
                    isSelected && styles.holeButtonSelected,
                  ]}
                  onPress={() => toggleHole(holeNumber)}
                >
                  <Text style={[
                    styles.holeNumber,
                    isSelected && styles.holeNumberSelected,
                  ]}>
                    {holeNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reasons Section */}
          {localSelectedHoles.length > 0 && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>Why are these your favorite holes?</Text>
              {localSelectedHoles
                .sort((a, b) => a.number - b.number)
                .map((hole) => (
                  <View key={hole.number} style={styles.reasonItem}>
                    <View style={styles.reasonHeader}>
                      <Text style={styles.reasonHoleNumber}>Hole {hole.number}</Text>
                    </View>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="What makes this hole special?"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={hole.reason}
                      onChangeText={(text) => updateHoleReason(hole.number, text)}
                      multiline
                      inputAccessoryViewID={inputAccessoryViewID}
                    />
                  </View>
                ))}
            </View>
          )}
        </ScrollView>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View style={[styles.keyboardAccessory, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Text style={[styles.doneButtonText, { color: theme.colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            Save Favorite Holes ({localSelectedHoles.length})
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}; 