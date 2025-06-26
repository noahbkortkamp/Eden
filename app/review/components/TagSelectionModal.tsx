import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Platform,
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

// Memoized tag button component for better performance
const TagButton = React.memo<{
  tag: Tag;
  isSelected: boolean;
  onPress: (tag: Tag) => void;
  edenTheme: any;
}>(({ tag, isSelected, onPress, edenTheme }) => {
  const handlePress = useCallback(() => onPress(tag), [tag, onPress]);
  
  return (
    <TouchableOpacity
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
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
});

// Memoized category component for better performance
const CategorySection = React.memo<{
  category: string;
  tags: Tag[];
  isExpanded: boolean;
  selectedTagIds: Set<string>;
  onToggleCategory: (category: string) => void;
  onToggleTag: (tag: Tag) => void;
  edenTheme: any;
}>(({ category, tags, isExpanded, selectedTagIds, onToggleCategory, onToggleTag, edenTheme }) => {
  const handleToggleCategory = useCallback(() => onToggleCategory(category), [category, onToggleCategory]);
  
  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity 
        style={styles.categoryHeader}
        onPress={handleToggleCategory}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoryTitle, edenTheme.typography.h3, { color: colors.text.primary }]}>
          {category.replace(/_/g, ' ')}
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: 16 }}>
          {isExpanded ? '▼' : '►'}
        </Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.tagsGrid}>
          {tags.map((tag) => (
            <TagButton
              key={tag.id}
              tag={tag}
              isSelected={selectedTagIds.has(tag.id)}
              onPress={onToggleTag}
              edenTheme={edenTheme}
            />
          ))}
        </View>
      )}
    </View>
  );
});

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

  // Memoized selected tag IDs set for performance
  const selectedTagIds = useMemo(() => 
    new Set(localSelectedTags.map(tag => tag.id)), 
    [localSelectedTags]
  );

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

  const toggleTag = useCallback((tag: Tag) => {
    setLocalSelectedTags((prev) => {
      const isSelected = prev.some((t) => t.id === tag.id);
      if (isSelected) {
        return prev.filter((t) => t.id !== tag.id);
      }
      return [...prev, tag];
    });
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  }, []);

  const handleSave = useCallback(() => {
    onSave(localSelectedTags);
    onClose();
  }, [localSelectedTags, onSave, onClose]);

  const handleClear = useCallback(() => {
    setLocalSelectedTags([]);
  }, []);

  const handleOpenSuggestionModal = useCallback(() => {
    console.log('DEBUG: handleOpenSuggestionModal called');
    onClose();
    setTimeout(() => {
      setSuggestionModalVisible(true);
      console.log('DEBUG: setSuggestionModalVisible set to', true);
    }, 300);
  }, [onClose]);

  // Memoized filtered categories for performance
  const filteredCategories = useMemo(() => {
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
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return categoryA.localeCompare(categoryB);
    });

    return Object.fromEntries(sortedEntries);
  }, [dbTags, searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, edenTheme.typography.h3]}>
              Select Course Tags
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={16} color={colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tags..."
                placeholderTextColor={colors.text.secondary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch}>
                  <X size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            decelerationRate="normal"
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={[edenTheme.typography.body, styles.loadingText]}>
                  Loading tags...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[edenTheme.typography.body, styles.errorText]}>
                  {error}
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchTags}
                >
                  <Text style={[edenTheme.typography.buttonSmall, styles.retryButtonText]}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : Object.keys(filteredCategories).length === 0 ? (
              <Text style={[styles.noResults, edenTheme.typography.bodySmall]}>
                No tags match your search
              </Text>
            ) : (
              Object.entries(filteredCategories).map(([category, tags]) => (
                <CategorySection
                  key={category}
                  category={category}
                  tags={tags}
                  isExpanded={expandedCategories.includes(category)}
                  selectedTagIds={selectedTagIds}
                  onToggleCategory={toggleCategory}
                  onToggleTag={toggleTag}
                  edenTheme={edenTheme}
                />
              ))
            )}
            
            <TouchableOpacity 
              style={styles.newTagButton}
              onPress={handleOpenSuggestionModal}
            >
              <Text style={[styles.newTagText, edenTheme.typography.buttonSecondary]}>
                Have a new tag idea? Let us know!
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClear}
            >
              <Text style={[styles.clearButtonText, edenTheme.typography.buttonSecondary]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, edenTheme.typography.button]}>
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.background.paper,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    flex: 1,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.paper,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.base,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  categoryContainer: {
    marginBottom: spacing.lg,
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
  },
  categoryTitle: {
    flex: 1,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xs, // Negative margin to offset tag margins
  },
  tagButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    margin: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36, // Consistent height for better touch targets
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedIndicator: {
    marginLeft: spacing.xs,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.paper,
  },
  clearButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.paper,
    flex: 1,
    marginRight: spacing.sm,
  },
  clearButtonText: {
    fontWeight: '600',
    color: colors.feedback.negative,
  },
  saveButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    flex: 2,
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  errorText: {
    color: colors.feedback.negative,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.primary,
  },
  retryButtonText: {
    color: colors.text.inverse,
  },
  noResults: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.text.secondary,
  },
  newTagButton: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  newTagText: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
}); 