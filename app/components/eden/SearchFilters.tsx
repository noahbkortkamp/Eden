import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useEdenTheme } from '../../theme';
import { Heading3, BodyText } from './Typography';
import { FilterChip } from './FilterChip';
import { Card } from './Card';

// Define filter value types
export type FilterValue = string | number;

// Define filter option with label and value
export interface FilterOption {
  label: string;
  value: FilterValue;
  icon?: string;
}

// Define a filter section with title and options
export interface FilterSection {
  title: string;
  key: string;
  options: FilterOption[];
  values: FilterValue[];
  // Function that handles selecting/deselecting a value
  onToggle: (value: FilterValue) => void;
}

export interface SearchFiltersProps {
  /**
   * List of filter sections to display
   */
  sections: FilterSection[];
  
  /**
   * Title to display at the top of the filters
   */
  title?: string;
  
  /**
   * Additional description text
   */
  description?: string;
}

/**
 * SearchFilters component built with Eden design system
 * Used for displaying multiple filter categories with selectable options
 */
export const SearchFilters: React.FC<SearchFiltersProps> = ({
  sections,
  title = 'Filters',
  description,
}) => {
  const theme = useEdenTheme();
  
  // Render a single filter section
  const renderFilterSection = useCallback((section: FilterSection) => {
    return (
      <View key={section.key} style={styles.section}>
        <Heading3 style={styles.sectionTitle}>
          {section.title}
        </Heading3>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
        >
          {section.options.map((option) => (
            <FilterChip
              key={`${option.value}`}
              label={option.label}
              icon={option.icon}
              selected={section.values.includes(option.value)}
              onToggle={() => section.onToggle(option.value)}
              style={styles.chip}
            />
          ))}
        </ScrollView>
      </View>
    );
  }, []);
  
  return (
    <Card variant="default" style={styles.container}>
      {title && (
        <Heading3 style={styles.title}>
          {title}
        </Heading3>
      )}
      
      {description && (
        <BodyText 
          color={theme.colors.textSecondary} 
          style={styles.description}
        >
          {description}
        </BodyText>
      )}
      
      {sections.map(renderFilterSection)}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 0,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    marginRight: 8,
  },
}); 