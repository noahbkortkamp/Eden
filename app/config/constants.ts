export type FilterValue = number | string;

export interface FilterOption {
  label: string;
  value: FilterValue;
}

export enum DifficultyLevel {
  Beginner = 1,
  Intermediate = 2,
  Advanced = 3,
  Expert = 4,
  Professional = 5,
}

export enum PriceRange {
  Budget = '$',
  Moderate = '$$',
  Expensive = '$$$',
  Luxury = '$$$$',
}

export const DIFFICULTY_OPTIONS: FilterOption[] = [
  { label: 'Beginner', value: DifficultyLevel.Beginner },
  { label: 'Intermediate', value: DifficultyLevel.Intermediate },
  { label: 'Advanced', value: DifficultyLevel.Advanced },
  { label: 'Expert', value: DifficultyLevel.Expert },
  { label: 'Professional', value: DifficultyLevel.Professional },
];

export const HOLES_OPTIONS: FilterOption[] = [
  { label: '9 Holes', value: 9 },
  { label: '18 Holes', value: 18 },
  { label: '27 Holes', value: 27 },
  { label: '36 Holes', value: 36 },
];

export const PRICE_OPTIONS: FilterOption[] = [
  { label: 'Budget', value: PriceRange.Budget },
  { label: 'Moderate', value: PriceRange.Moderate },
  { label: 'Expensive', value: PriceRange.Expensive },
  { label: 'Luxury', value: PriceRange.Luxury },
];

export const AMENITIES_OPTIONS: FilterOption[] = [
  { label: 'Pro Shop', value: 'Pro Shop' },
  { label: 'Restaurant', value: 'Restaurant' },
  { label: 'Practice Facility', value: 'Practice Facility' },
  { label: 'Driving Range', value: 'Driving Range' },
  { label: 'Cart Rental', value: 'Cart Rental' },
  { label: 'Club Rental', value: 'Club Rental' },
]; 