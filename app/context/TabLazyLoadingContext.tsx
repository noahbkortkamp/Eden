import React, { createContext, useContext, ReactNode } from 'react';
import { useTabLazyLoading } from '../hooks/useTabLazyLoading';

interface TabLazyLoadingContextType {
  markTabAsActivated: (tabName: string) => void;
  isTabActivated: (tabName: string) => boolean;
  getActivatedTabs: () => string[];
  activatedTabsCount: number;
}

const TabLazyLoadingContext = createContext<TabLazyLoadingContextType | undefined>(undefined);

export function TabLazyLoadingProvider({ children }: { children: ReactNode }) {
  // Initialize with 'lists' as the first active tab since it's the initial route
  const lazyLoadingState = useTabLazyLoading(['lists']);
  
  return (
    <TabLazyLoadingContext.Provider value={lazyLoadingState}>
      {children}
    </TabLazyLoadingContext.Provider>
  );
}

export function useTabLazyLoadingContext() {
  const context = useContext(TabLazyLoadingContext);
  if (context === undefined) {
    throw new Error('useTabLazyLoadingContext must be used within a TabLazyLoadingProvider');
  }
  return context;
} 