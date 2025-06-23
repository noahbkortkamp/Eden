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
  ActivityIndicator,
} from 'react-native';
import { useEdenTheme } from '../../theme/ThemeProvider';
import { colors, spacing, borderRadius } from '../../theme/tokens';
import { X, Search, Check } from 'lucide-react-native';
import { Tag } from '../constants/tags';
import { TagSuggestionModal } from './TagSuggestionModal';
import { getAllTags } from '../../utils/reviews';

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
  const [dbTags, setDbTags] = useState<Record<string, Tag[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define the desired category order
  const CATEGORY_ORDER = [
    'Conditions',
    'Course Type',
    'Design Features',
    'Pace of Play',
    'Value',
    'Amenities',
    'Food & Beverage',
    'Practice Facilities'
  ];

  // Fetch tags from Supabase when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchTags();
    }
  }, [visible]);

  // Fetch all tags from Supabase
  const fetchTags = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tags = await getAllTags();
      
      // Group tags by category
      const tagsByCategory = tags.reduce((acc, tag) => {
        if (!acc[tag.category]) {
          acc[tag.category] = [];
        }
        acc[tag.category].push(tag);
        return acc;
      }, {} as Record<string, Tag[]>);
      
      setDbTags(tagsByCategory);
      setExpandedCategories(Object.keys(tagsByCategory));
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Failed to load tags. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Convert tag IDs to full tag objects when selectedTags changes
    setLocalSelectedTags(selectedTags);
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

  // Filter tags based on search query and apply custom category ordering
  const filteredCategories = (() => {
    // First filter based on search query
    const filtered = Object.entries(dbTags).reduce((acc, [category, tags]) => {
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

    // Then sort categories according to CATEGORY_ORDER
    const sortedEntries = Object.entries(filtered).sort(([categoryA], [categoryB]) => {
      const indexA = CATEGORY_ORDER.indexOf(categoryA);
      const indexB = CATEGORY_ORDER.indexOf(categoryB);
      
      // If both categories are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one category is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither category is in the order array, sort alphabetically
      return categoryA.localeCompare(categoryB);
    });

    return Object.fromEntries(sortedEntries);
  })();

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
            
            <View style={styles.searchWrapperContainer}>
              <View style={[styles.searchContainer, {
                borderColor: colors.border.default,
                backgroundColor: colors.background.paper,
              }]}>
                <Search size={16} color={colors.text.secondary} />
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
                    <X size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            <View style={styles.contentContainer}>
              <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                onScrollBeginDrag={Keyboard.dismiss}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                directionalLockEnabled={false}
                alwaysBounceVertical={true}
                scrollEventThrottle={16}
                decelerationRate="normal"
                bounces={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.scrollInnerContent}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.accent.primary} />
                      <Text style={[edenTheme.typography.body, { color: colors.text.primary, marginTop: spacing.md }]}>
                        Loading tags...
                      </Text>
                    </View>
                  ) : error ? (
                    <View style={styles.errorContainer}>
                      <Text style={[edenTheme.typography.body, { color: colors.feedback.negative }]}>
                        {error}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: colors.accent.primary }]} 
                        onPress={fetchTags}
                      >
                        <Text style={[edenTheme.typography.buttonSmall, { color: colors.text.inverse }]}>
                          Retry
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : Object.keys(filteredCategories).length === 0 ? (
                    <Text style={[styles.noResults, edenTheme.typography.bodySmall, { color: colors.text.secondary }]}>
                      No tags match your search
                    </Text>
                  ) : (
                    Object.entries(filteredCategories).map(([category, tags]) => (
                      <View key={category} style={styles.categoryContainer}>
                        <TouchableOpacity 
                          style={styles.categoryHeader}
                          onPress={() => toggleCategory(category)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.categoryTitle, edenTheme.typography.h3, { color: colors.text.primary }]}>
                            {category.replace(/_/g, ' ')}
                          </Text>
                          <Text style={{ color: colors.text.secondary }}>
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
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                >
                                  <Text style={[
                                    styles.tagText,
                                    edenTheme.typography.tag,
                                    { color: isSelected ? colors.accent.primary : colors.text.primary },
                                  ]}>
                                    {tag.name}
                                  </Text>
                                  {isSelected && (
                                    <View style={styles.selectedIndicator}>
                                      <Check size={14} color={colors.accent.primary} strokeWidth={3} />
                                    </View>
                                  )}
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
                </View>
              </ScrollView>
            </View>

            <View style={[styles.buttonRow, {
              borderTopColor: colors.border.default,
              backgroundColor: colors.background.paper
            }]}>
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
                <Text style={[styles.clearButtonText, edenTheme.typography.buttonSecondary, { color: colors.feedback.negative }]}>
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
                <Text style={[styles.saveButtonText, edenTheme.typography.button, { color: colors.text.inverse }]}>
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
    backgroundColor: colors.background.base,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.background.paper,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  searchWrapperContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background.base,
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    flexGrow: 1,
  },
  scrollInnerContent: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  categoryContainer: {
    marginBottom: spacing.md,
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginBottom: spacing.sm,
    width: '100%',
  },
  categoryTitle: {
    flex: 1,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  tagButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    marginRight: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  selectedIndicator: {
    marginLeft: spacing.xs,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 