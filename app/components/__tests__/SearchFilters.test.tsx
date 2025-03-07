import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SearchFiltersComponent } from '../SearchFilters';
import { SearchFilters } from '../../types';

describe('SearchFiltersComponent', () => {
  const mockFilters: SearchFilters = {
    difficulty: [],
    numberOfHoles: [],
    priceRange: [],
    amenities: [],
  };

  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all filter sections', () => {
    render(
      <SearchFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Number of Holes')).toBeTruthy();
    expect(screen.getByText('Price Range')).toBeTruthy();
    expect(screen.getByText('Amenities')).toBeTruthy();
  });

  it('toggles difficulty filter correctly', () => {
    render(
      <SearchFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const beginnerButton = screen.getByText('Beginner');
    fireEvent.press(beginnerButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      difficulty: [1],
    });
  });

  it('toggles holes filter correctly', () => {
    render(
      <SearchFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const nineHolesButton = screen.getByText('9 Holes');
    fireEvent.press(nineHolesButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      numberOfHoles: [9],
    });
  });

  it('toggles price filter correctly', () => {
    render(
      <SearchFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const budgetButton = screen.getByText('Budget');
    fireEvent.press(budgetButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      priceRange: ['$'],
    });
  });

  it('toggles amenity filter correctly', () => {
    render(
      <SearchFiltersComponent
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const proShopButton = screen.getByText('Pro Shop');
    fireEvent.press(proShopButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      amenities: ['Pro Shop'],
    });
  });

  it('removes filter when toggling selected value', () => {
    const filtersWithSelected: SearchFilters = {
      ...mockFilters,
      difficulty: [1],
    };

    render(
      <SearchFiltersComponent
        filters={filtersWithSelected}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const beginnerButton = screen.getByText('Beginner');
    fireEvent.press(beginnerButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      difficulty: [],
    });
  });

  it('handles multiple selected filters', () => {
    const filtersWithMultiple: SearchFilters = {
      ...mockFilters,
      difficulty: [1, 2],
    };

    render(
      <SearchFiltersComponent
        filters={filtersWithMultiple}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const intermediateButton = screen.getByText('Intermediate');
    fireEvent.press(intermediateButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      difficulty: [1],
    });
  });
}); 