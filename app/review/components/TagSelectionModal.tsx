import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useEdenTheme } from '../../theme/ThemeProvider';
import { colors, spacing, borderRadius } from '../../theme/tokens';
import { X, Search } from 'lucide-react-native';
import { Tag, TAGS_BY_CATEGORY } from '../constants/tags';
import { TagSuggestionModal } from './TagSuggestionModal';

interface TagSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selectedTags: Tag[]) => void;
  selectedTags: Tag[];
}

export const TagSelectionModal: React.FC<TagSelectionModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedTags,
}) => {
  const edenTheme = useEdenTheme();
  const [localSelectedTags, setLocalSelectedTags] = useState<Tag[]>(selectedTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(TAGS_BY_CATEGORY));
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);

  useEffect(() => {
    // Convert tag IDs to full tag objects when selectedTags changes
    const allTags = Object.values(TAGS_BY_CATEGORY).flat();
    const tagObjects = selectedTags.map(tag => {
      if (typeof tag === 'string') {
        // If we received a tag ID, find the full tag object
        return allTags.find(t => t.id === tag) || allTags.find(t => t.name === tag);
      }
      return tag;
    }).filter((tag): tag is Tag => tag !== undefined);
    setLocalSelectedTags(tagObjects);
  }, [selectedTags]);

  // Add keyboard event listener
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Keyboard is shown
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Keyboard is hidden
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const toggleTag = (tag: Tag) => {
    setLocalSelectedTags((prev) => {
      const isSelected = prev.some((t) => t.id === tag.id);
      if (isSelected) {
        return prev.filter((t) => t.id !== tag.id);
      }
      return [...prev, tag];
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleSave = () => {
    onSave(localSelectedTags);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedTags([]);
  };

  const handleOpenSuggestionModal = () => {
    console.log('DEBUG: handleOpenSuggestionModal called');
    // First close the current modal, then open the suggestion modal
    onClose(); // Close the TagSelectionModal first
    // Use setTimeout to ensure the first modal is closed before opening the second
    setTimeout(() => {
      setSuggestionModalVisible(true);
      console.log('DEBUG: setSuggestionModalVisible set to', true);
    }, 300);
  };

  // Filter tags based on search query
  const filteredCategories = Object.entries(TAGS_BY_CATEGORY).reduce((acc, [category, tags]) => {
    if (searchQuery.trim() === '') {
      acc[category] = tags;
      return acc;
    }
    
    const filteredTags = tags.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredTags.length > 0) {
      acc[category] = filteredTags;
    }
    
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.base }]}>
            <View style={[styles.header, { 
              backgroundColor: colors.background.paper,
              borderBottomColor: colors.border.default,
            }]}>
              <Text style={[styles.headerTitle, edenTheme.typography.h3]}>
                Select Course Tags
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, {
              borderColor: colors.border.default,
              backgroundColor: colors.background.paper,
            }]}>
              <Search size={20} color={colors.text.secondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary }]}
                placeholder="Search tags..."
                placeholderTextColor={colors.text.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <Text style={[styles.selectedCount, edenTheme.typography.body, { color: colors.text.primary }]}>
              Selected: {localSelectedTags.length} tag{localSelectedTags.length !== 1 ? 's' : ''}
            </Text>

            <ScrollView 
              style={styles.content}
              onScrollBeginDrag={Keyboard.dismiss}
            >
              {Object.keys(filteredCategories).length === 0 ? (
                <Text style={[styles.noResults, edenTheme.typography.bodySmall, { color: colors.text.secondary }]}>
                  No tags match your search
                </Text>
              ) : (
                Object.entries(filteredCategories).map(([category, tags]) => (
                  <View key={category} style={styles.categoryContainer}>
                    <TouchableOpacity 
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category)}
                    >
                      <Text style={[styles.categoryTitle, edenTheme.typography.h3]}>
                        {category}
                      </Text>
                      <Text style={{ color: colors.text.primary }}>
                        {expandedCategories.includes(category) ? '▼' : '►'}
                      </Text>
                    </TouchableOpacity>
                    
                    {expandedCategories.includes(category) && (
                      <View style={styles.tagsGrid}>
                        {tags.map((tag) => {
                          const isSelected = localSelectedTags.some((t) => t.id === tag.id);
                          return (
                            <TouchableOpacity
                              key={tag.id}
                              style={[
                                styles.tagButton,
                                { 
                                  borderColor: colors.border.default,
                                  backgroundColor: colors.background.paper,
                                },
                                isSelected && { 
                                  backgroundColor: colors.accent.primary + '20',
                                  borderColor: colors.accent.primary,
                                },
                              ]}
                              onPress={() => toggleTag(tag)}
                            >
                              <Text style={[
                                styles.tagText,
                                edenTheme.typography.tag,
                                { color: isSelected ? colors.accent.primary : colors.text.primary },
                              ]}>
                                {tag.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))
              )}
              
              <TouchableOpacity 
                style={[styles.newTagButton, { borderTopColor: colors.border.default }]}
                onPress={handleOpenSuggestionModal}
              >
                <Text style={[styles.newTagText, edenTheme.typography.buttonSecondary]}>
                  Have a new tag idea? Let us know!
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[
                  styles.clearButton, 
                  {
                    backgroundColor: colors.background.paper,
                    borderColor: colors.border.default,
                  }
                ]} 
                onPress={handleClear}
              >
                <Text style={[styles.clearButtonText, { color: colors.feedback.negative }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: colors.accent.primary,
                  }
                ]} 
                onPress={handleSave}
              >
                <Text style={[styles.saveButtonText, edenTheme.typography.button]}>
                  Save Tags
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </Modal>
      
      <TagSuggestionModal 
        visible={suggestionModalVisible} 
        onClose={() => setSuggestionModalVisible(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  categoryContainer: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  categoryTitle: {
    flex: 1,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {},
  selectedCount: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: spacing.md,
  },
  clearButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    marginRight: spacing.sm,
  },
  clearButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flex: 2,
  },
  saveButtonText: {},
  noResults: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  newTagButton: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  newTagText: {
    textAlign: 'center',
  },
}); 