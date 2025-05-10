import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SearchFilters } from '../types';
import {
  DIFFICULTY_OPTIONS,
  HOLES_OPTIONS,
  PRICE_OPTIONS,
  AMENITIES_OPTIONS,
  FilterOption,
  FilterValue,
} from '../config/constants';
import { useEdenTheme } from '../theme';

interface Props {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selectedValues: FilterValue[];
  onToggle: (value: FilterValue) => void;
}

const FilterSection = memo(({ 
  title, 
  options, 
  selectedValues, 
  onToggle 
}: FilterSectionProps) => {
  const { t } = useTranslation();
  const theme = useEdenTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel={`${title} ${t('filters.options')}`}
      >
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterOption,
                { backgroundColor: theme.colors.surface },
                selectedValues.includes(option.value) && [styles.filterOptionSelected, { backgroundColor: theme.colors.primary }],
              ]}
              onPress={() => onToggle(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} ${selectedValues.includes(option.value) ? t('filters.selected') : t('filters.notSelected')}`}
              accessibilityState={{ selected: selectedValues.includes(option.value) }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  { color: theme.colors.textSecondary },
                  selectedValues.includes(option.value) && [styles.filterOptionTextSelected, { color: '#FFFFFF' }],
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

export function SearchFiltersComponent({ filters, onFiltersChange }: Props) {
  const { t } = useTranslation();
  const theme = useEdenTheme();

  const toggleDifficulty = useCallback((value: FilterValue) => {
    if (typeof value !== 'number') return;
    
    const currentDifficulties = filters.difficulty || [];
    const newDifficulties = currentDifficulties.includes(value)
      ? currentDifficulties.filter(v => v !== value)
      : [...currentDifficulties, value];
    
    onFiltersChange({
      ...filters,
      difficulty: newDifficulties,
    });
  }, [filters, onFiltersChange]);

  const toggleHoles = useCallback((value: FilterValue) => {
    if (typeof value !== 'number') return;
    
    const currentHoles = filters.numberOfHoles || [];
    const newHoles = currentHoles.includes(value)
      ? currentHoles.filter(v => v !== value)
      : [...currentHoles, value];
    
    onFiltersChange({
      ...filters,
      numberOfHoles: newHoles,
    });
  }, [filters, onFiltersChange]);

  const togglePrice = useCallback((value: FilterValue) => {
    if (typeof value !== 'string') return;
    
    const currentPrices = filters.priceRange || [];
    const newPrices = currentPrices.includes(value)
      ? currentPrices.filter(v => v !== value)
      : [...currentPrices, value];
    
    onFiltersChange({
      ...filters,
      priceRange: newPrices,
    });
  }, [filters, onFiltersChange]);

  const toggleAmenity = useCallback((value: FilterValue) => {
    if (typeof value !== 'string') return;
    
    const currentAmenities = filters.amenities || [];
    const newAmenities = currentAmenities.includes(value)
      ? currentAmenities.filter(v => v !== value)
      : [...currentAmenities, value];
    
    onFiltersChange({
      ...filters,
      amenities: newAmenities,
    });
  }, [filters, onFiltersChange]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FilterSection
        title={t('filters.difficulty')}
        options={DIFFICULTY_OPTIONS}
        selectedValues={filters.difficulty || []}
        onToggle={toggleDifficulty}
      />
      <FilterSection
        title={t('filters.numberOfHoles')}
        options={HOLES_OPTIONS}
        selectedValues={filters.numberOfHoles || []}
        onToggle={toggleHoles}
      />
      <FilterSection
        title={t('filters.priceRange')}
        options={PRICE_OPTIONS}
        selectedValues={filters.priceRange || []}
        onToggle={togglePrice}
      />
      <FilterSection
        title={t('filters.amenities')}
        options={AMENITIES_OPTIONS}
        selectedValues={filters.amenities || []}
        onToggle={toggleAmenity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 9999,
    marginRight: 8,
  },
  filterOptionSelected: {
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionTextSelected: {
  },
}); 