import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '../types/review';

// Define the context type
interface PlayedCoursesContextType {
  playedCourses: Course[];
  setPlayedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  wantToPlayCourses: Course[];
  setWantToPlayCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  recommendedCourses: Course[];
  setRecommendedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  // A utility flag to track if courses are loading
  isCoursesLoading: boolean;
  setCoursesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // A flag to track if we've attempted to load courses at least once
  hasLoadedCourses: boolean;
  setHasLoadedCourses: React.Dispatch<React.SetStateAction<boolean>>;
  // Add timestamp to track when data was last updated
  lastUpdateTimestamp: number;
  // Function to force a refresh of courses data
  setNeedsRefresh: () => void;
  // Function to refresh lists after bookmark operations
  refreshLists: () => void;
}

// Create the context with a default value
const PlayedCoursesContext = createContext<PlayedCoursesContextType | undefined>(undefined);

// Provider component
export function PlayedCoursesProvider({ children }: { children: ReactNode }) {
  const [playedCourses, setPlayedCourses] = useState<Course[]>([]);
  const [wantToPlayCourses, setWantToPlayCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isCoursesLoading, setCoursesLoading] = useState<boolean>(false);
  const [hasLoadedCourses, setHasLoadedCourses] = useState<boolean>(false);
  // Initialize timestamp with current time
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());

  // Function to force a refresh by updating the timestamp and resetting hasLoadedCourses
  const setNeedsRefresh = () => {
    console.log('🔄 CONTEXT: Marking courses data for refresh');
    setLastUpdateTimestamp(Date.now());
    setHasLoadedCourses(false);
  };
  
  // Function to refresh lists after bookmark operations
  const refreshLists = () => {
    console.log('🔄 CONTEXT: Refreshing lists after bookmark operation');
    setLastUpdateTimestamp(Date.now());
    // For immediate UI update, we can also directly filter out the removed course
    // But we'll rely on the parent component to fully refresh the data
  };

  // Log when the state changes to help with debugging
  React.useEffect(() => {
    console.log('🔄 CONTEXT: PlayedCoursesContext state updated:', {
      playedCount: playedCourses?.length || 0,
      wantToPlayCount: wantToPlayCourses?.length || 0,
      recommendedCount: recommendedCourses?.length || 0,
      isLoading: isCoursesLoading,
      hasLoadedCourses,
      lastUpdateTimestamp
    });
  }, [playedCourses, wantToPlayCourses, recommendedCourses, isCoursesLoading, hasLoadedCourses, lastUpdateTimestamp]);

  return (
    <PlayedCoursesContext.Provider
      value={{
        playedCourses,
        setPlayedCourses,
        wantToPlayCourses,
        setWantToPlayCourses,
        recommendedCourses,
        setRecommendedCourses,
        isCoursesLoading,
        setCoursesLoading,
        hasLoadedCourses,
        setHasLoadedCourses,
        lastUpdateTimestamp,
        setNeedsRefresh,
        refreshLists
      }}
    >
      {children}
    </PlayedCoursesContext.Provider>
  );
}

// Custom hook for using the context
export function usePlayedCourses() {
  const context = useContext(PlayedCoursesContext);
  if (context === undefined) {
    throw new Error('usePlayedCourses must be used within a PlayedCoursesProvider');
  }
  return context;
} 