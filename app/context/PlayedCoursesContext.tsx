import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Course } from '../types/review';
import { bookmarkService } from '../services/bookmarkService';

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
  // Phase 2: Add data fingerprints for change detection
  dataFingerprint: string;
}

// Create the context with a default value
const PlayedCoursesContext = createContext<PlayedCoursesContextType | undefined>(undefined);

// Helper function to create data fingerprint for change detection
function createDataFingerprint(played: Course[], wantToPlay: Course[], recommended: Course[]): string {
  const playedIds = played.map(c => c.id).sort().join(',');
  const wantToPlayIds = wantToPlay.map(c => c.id).sort().join(',');
  const recommendedIds = recommended.map(c => c.id).sort().join(',');
  return `p:${playedIds}|w:${wantToPlayIds}|r:${recommendedIds}`;
}

// Provider component
export function PlayedCoursesProvider({ children }: { children: ReactNode }) {
  const [playedCourses, setPlayedCourses] = useState<Course[]>([]);
  const [wantToPlayCourses, setWantToPlayCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isCoursesLoading, setCoursesLoading] = useState<boolean>(false);
  const [hasLoadedCourses, setHasLoadedCourses] = useState<boolean>(false);
  // Initialize timestamp with current time
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());

  // Phase 2: Memoized data fingerprint for efficient change detection
  const dataFingerprint = useMemo(() => {
    return createDataFingerprint(playedCourses, wantToPlayCourses, recommendedCourses);
  }, [playedCourses, wantToPlayCourses, recommendedCourses]);

  // Phase 2: Memoized callback functions to prevent unnecessary re-renders
  const setNeedsRefresh = useCallback(() => {
    console.log('🔄 CONTEXT: Marking courses data for refresh');
    setLastUpdateTimestamp(Date.now());
    setHasLoadedCourses(false);
  }, []);
  
  const refreshLists = useCallback(() => {
    console.log('🔄 CONTEXT: Refreshing lists after bookmark operation');
    setLastUpdateTimestamp(Date.now());
    // For immediate UI update, we can also directly filter out the removed course
    // But we'll rely on the parent component to fully refresh the data
  }, []);

  // Register with bookmark service when the context is initialized
  useEffect(() => {
    // Register the refresh callback with the bookmark service
    bookmarkService.registerRefreshCallback(setNeedsRefresh);
    
    // Clean up on unmount
    return () => {
      bookmarkService.unregisterRefreshCallback();
    };
  }, [setNeedsRefresh]);

  // Phase 2: Optimized logging with reduced frequency and more efficient checks
  useEffect(() => {
    // Only log when data actually changes (not just re-renders)
    const logData = {
      playedCount: playedCourses?.length || 0,
      wantToPlayCount: wantToPlayCourses?.length || 0,
      recommendedCount: recommendedCourses?.length || 0,
      isLoading: isCoursesLoading,
      hasLoadedCourses,
      lastUpdateTimestamp,
      fingerprint: dataFingerprint.substring(0, 20) + '...' // Truncated for readability
    };
    
    // Use a more efficient logging approach
    console.log('🔄 CONTEXT: PlayedCoursesContext state updated:', logData);
  }, [dataFingerprint, isCoursesLoading, hasLoadedCourses, lastUpdateTimestamp]); // Only re-run when fingerprint or loading states change

  // Phase 2: Memoize the context value to prevent unnecessary re-renders of consuming components
  const contextValue = useMemo(() => ({
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
    refreshLists,
    dataFingerprint
  }), [
    playedCourses,
    wantToPlayCourses,
    recommendedCourses,
    isCoursesLoading,
    hasLoadedCourses,
    lastUpdateTimestamp,
    setNeedsRefresh,
    refreshLists,
    dataFingerprint
  ]);

  return (
    <PlayedCoursesContext.Provider value={contextValue}>
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