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
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
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
  const theme = useTheme();
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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      color: theme.colors.text,
    },
    categoryContainer: {
      marginBottom: theme.spacing.lg,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    categoryTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    tagButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    tagButtonSelected: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
    },
    tagText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    tagTextSelected: {
      color: theme.colors.primary,
    },
    selectedCount: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      color: theme.colors.text,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      margin: theme.spacing.md,
    },
    clearButton: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    clearButtonText: {
      ...theme.typography.body,
      color: theme.colors.error,
      fontWeight: '600',
    },
    saveButton: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      flex: 2,
    },
    saveButtonText: {
      ...theme.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    noResults: {
      textAlign: 'center',
      marginTop: theme.spacing.xl,
      color: theme.colors.textSecondary,
    },
    newTagButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    newTagText: {
      ...theme.typography.body,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Course Tags</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tags..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <Text style={styles.selectedCount}>
            Selected: {localSelectedTags.length} tag{localSelectedTags.length !== 1 ? 's' : ''}
          </Text>

          <ScrollView style={styles.content}>
            {Object.keys(filteredCategories).length === 0 ? (
              <Text style={styles.noResults}>No tags match your search</Text>
            ) : (
              Object.entries(filteredCategories).map(([category, tags]) => (
                <View key={category} style={styles.categoryContainer}>
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Text>{expandedCategories.includes(category) ? '▼' : '►'}</Text>
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
                              isSelected && styles.tagButtonSelected,
                            ]}
                            onPress={() => toggleTag(tag)}
                          >
                            <Text style={[
                              styles.tagText,
                              isSelected && styles.tagTextSelected,
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
              style={styles.newTagButton}
              onPress={handleOpenSuggestionModal}
            >
              <Text style={styles.newTagText}>
                Have a new label idea? Let us know!
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                Save Tags
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      <TagSuggestionModal 
        visible={suggestionModalVisible} 
        onClose={() => setSuggestionModalVisible(false)} 
      />
    </>
  );
}; 