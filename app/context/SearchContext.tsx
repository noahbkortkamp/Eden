import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GolfCourse, User, SearchFilters, LocationData } from '../types';
import { api } from '../services/api';
import { locationService } from '../services/location';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  location: LocationData | null;
  setLocation: (location: LocationData | null) => void;
  searchResults: {
    courses: GolfCourse[];
    users: User[];
  };
  loading: boolean;
  error: string | null;
  searchCourses: (query: string, filters?: SearchFilters) => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  updateLocation: () => Promise<void>;
  searchLocations: (query: string) => Promise<LocationData[]>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [location, setLocation] = useState<LocationData | null>(null);
  const [searchResults, setSearchResults] = useState<{ courses: GolfCourse[]; users: User[] }>({
    courses: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize location when the app starts
  useEffect(() => {
    updateLocation();
  }, []);

  const updateLocation = useCallback(async () => {
    try {
      const currentLocation = await locationService.getCurrentLocation();
      if (currentLocation) {
        setLocation(currentLocation);
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, []);

  const searchLocations = useCallback(async (query: string) => {
    return locationService.searchLocations(query);
  }, []);

  const searchCourses = useCallback(async (query: string, searchFilters?: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await api.searchCourses({
        query,
        filters: searchFilters || filters,
        location,
      });
      
      setSearchResults(prev => ({
        ...prev,
        courses: results,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  }, [filters, location]);

  const searchUsers = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await api.searchUsers({ query });
      
      setSearchResults(prev => ({
        ...prev,
        users: results,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults({ courses: [], users: [] });
    setError(null);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        location,
        setLocation,
        searchResults,
        loading,
        error,
        searchCourses,
        searchUsers,
        clearSearch,
        updateLocation,
        searchLocations,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
} 