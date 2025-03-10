import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { X } from 'lucide-react-native';
import { Tag, TAGS_BY_CATEGORY } from '../constants/tags';

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
  const [localSelectedTags, setLocalSelectedTags] = React.useState<Tag[]>(selectedTags);

  React.useEffect(() => {
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

  const handleSave = () => {
    onSave(localSelectedTags);
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
    categoryContainer: {
      marginBottom: theme.spacing.lg,
    },
    categoryTitle: {
      ...theme.typography.h4,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    tagButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
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
  });

  return (
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
        
        <ScrollView style={styles.content}>
          {Object.entries(TAGS_BY_CATEGORY).map(([category, tags]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category}</Text>
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
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            Save Tags ({localSelectedTags.length})
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}; 