import React, { useRef } from 'react';
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useEdenTheme } from '../../theme/ThemeProvider';
import { colors, spacing, borderRadius } from '../../theme/tokens';
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
  const edenTheme = useEdenTheme();
  const [localSelectedHoles, setLocalSelectedHoles] = React.useState<FavoriteHole[]>(selectedHoles);
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeHoleNumber, setActiveHoleNumber] = React.useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  // Generate a unique ID for the input accessory view
  const inputAccessoryViewID = 'holeReasonInput';

  React.useEffect(() => {
    setLocalSelectedHoles(selectedHoles);
  }, [selectedHoles]);

  // Add keyboard listeners to detect keyboard appearance and adjust accordingly
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Re-scroll to active hole when keyboard appears
        if (activeHoleNumber !== null) {
          handleReasonFocus(activeHoleNumber);
        }
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [activeHoleNumber]);

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

  // Handle text input focus to scroll to the focused input
  const handleReasonFocus = (holeNumber: number) => {
    setActiveHoleNumber(holeNumber);
    
    setTimeout(() => {
      // Find the index of the hole in the sorted array
      const sortedHoles = [...localSelectedHoles].sort((a, b) => a.number - b.number);
      const index = sortedHoles.findIndex(h => h.number === holeNumber);
      if (index > -1 && scrollViewRef.current) {
        // Use a smaller offset to keep hole number in view
        // Reduced adjustment value to ensure the header stays visible
        const keyboardAdjustment = Platform.OS === 'ios' ? 120 : 100;
        scrollViewRef.current.scrollTo({
          y: index * 180 + keyboardAdjustment, // Reduced keyboard adjustment
          animated: true
        });
      }
    }, 100);
  };

  const handleReasonBlur = () => {
    setActiveHoleNumber(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.base }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 85 : 30}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={[styles.header, { 
              borderBottomColor: colors.border.default,
              backgroundColor: colors.background.paper
            }]}>
              <Text style={[styles.headerTitle, edenTheme.typography.h3]}>
                Select Favorite Holes
              </Text>
              <TouchableOpacity 
                style={[styles.closeButton, {
                  padding: spacing.sm,
                  borderRadius: borderRadius.sm,
                }]} 
                onPress={onClose}
              >
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.content} 
              keyboardShouldPersistTaps="handled" 
              ref={scrollViewRef}
              onScrollBeginDrag={Keyboard.dismiss}
              contentContainerStyle={{ 
                paddingBottom: keyboardHeight > 0 ? keyboardHeight * 0.5 : 0,
                paddingTop: spacing.sm,
              }}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
            >
              {/* Hole Selection Grid */}
              <View style={[
                styles.holesGrid,
                {
                  paddingHorizontal: spacing.sm,
                  marginVertical: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}>
                {Array.from({ length: totalHoles }, (_, i) => i + 1).map((holeNumber) => {
                  const isSelected = localSelectedHoles.some((h) => h.number === holeNumber);
                  return (
                    <TouchableOpacity
                      key={holeNumber}
                      style={[
                        styles.holeButton,
                        { 
                          borderColor: colors.border.default,
                          backgroundColor: colors.background.paper,
                          width: 45,
                          height: 45,
                          justifyContent: 'center',
                          alignItems: 'center',
                          display: 'flex',
                        },
                        isSelected && { 
                          backgroundColor: colors.accent.primary + '20',
                          borderColor: colors.accent.primary,
                        }
                      ]}
                      onPress={() => toggleHole(holeNumber)}
                    >
                      <Text style={[
                        styles.holeNumber,
                        edenTheme.typography.body,
                        { 
                          color: isSelected ? colors.accent.primary : colors.text.primary,
                          textAlign: 'center',
                          fontSize: 16,
                        }
                      ]}>
                        {holeNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Reasons Section */}
              {localSelectedHoles.length > 0 && (
                <View style={[styles.reasonsContainer, { 
                  marginBottom: keyboardHeight > 0 ? keyboardHeight * 0.3 : 0,
                  marginTop: spacing.md,
                }]}>
                  {localSelectedHoles
                    .sort((a, b) => a.number - b.number)
                    .map((hole) => (
                      <View key={hole.number} style={[
                        styles.reasonItem,
                        { 
                          backgroundColor: colors.background.paper,
                          borderColor: colors.border.default,
                          borderWidth: 1,
                          borderRadius: borderRadius.md,
                          padding: spacing.sm,
                          marginBottom: spacing.sm,
                        },
                        activeHoleNumber === hole.number && { 
                          borderColor: colors.accent.primary,
                          borderWidth: 2,
                        }
                      ]}>
                        <View style={[styles.reasonHeader, {
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.sm,
                          backgroundColor: colors.background.paper,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border.default,
                          marginBottom: spacing.xs,
                        }]}>
                          <Text style={[
                            styles.reasonHoleNumber, 
                            edenTheme.typography.h3,
                            { fontWeight: '600', color: colors.text.primary }
                          ]}>
                            Hole {hole.number}
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.reasonInput,
                            { 
                              color: colors.text.primary,
                              backgroundColor: colors.background.base,
                              borderColor: colors.border.default,
                              borderWidth: 1,
                              borderRadius: borderRadius.md,
                              padding: spacing.sm,
                              paddingTop: spacing.sm,
                              fontSize: 16,
                              fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
                              minHeight: 70,
                              maxHeight: 100,
                            }
                          ]}
                          placeholder="What makes this hole special?"
                          placeholderTextColor={colors.text.secondary}
                          value={hole.reason}
                          onChangeText={(text) => updateHoleReason(hole.number, text)}
                          multiline
                          textAlignVertical="top"
                          numberOfLines={3}
                          inputAccessoryViewID={inputAccessoryViewID}
                          onFocus={() => handleReasonFocus(hole.number)}
                          onBlur={handleReasonBlur}
                          blurOnSubmit={true}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                          keyboardType="default"
                          autoFocus={false}
                        />
                      </View>
                    ))}
                </View>
              )}
            </ScrollView>

            {Platform.OS === 'ios' && (
              <InputAccessoryView nativeID={inputAccessoryViewID}>
                <View style={[styles.keyboardAccessory, { backgroundColor: colors.background.paper }]}>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => Keyboard.dismiss()}
                  >
                    <Text style={[styles.doneButtonText, { color: colors.accent.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </InputAccessoryView>
            )}
            
            <View style={[
              { zIndex: 10 },
              keyboardHeight > 0 && {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
              }
            ]}>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  { 
                    backgroundColor: colors.accent.primary,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginHorizontal: spacing.md,
                    marginBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
                    marginTop: spacing.md,
                  }
                ]} 
                onPress={handleSave}
              >
                <Text style={[
                  styles.saveButtonText, 
                  edenTheme.typography.button,
                  { 
                    color: '#FFFFFF', 
                    textAlign: 'center', 
                    fontWeight: '600' 
                  }
                ]}>
                  Save Favorite Holes ({localSelectedHoles.length})
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  holesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  holeButton: {
    width: 45,
    height: 45,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeNumber: {
    textAlign: 'center',
  },
  reasonsContainer: {
    marginTop: spacing.md,
  },
  reasonsTitle: {
    marginBottom: spacing.md,
  },
  reasonItem: {
    marginBottom: spacing.sm,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reasonHoleNumber: {},
  reasonInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    // Empty since we're using inline styles
  },
  saveButtonText: {
    // Empty since we're using inline styles
  },
  keyboardAccessory: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
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