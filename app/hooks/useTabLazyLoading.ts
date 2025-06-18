import { useState, useCallback } from 'react';

export const useTabLazyLoading = (initialActiveTabs: string[] = []) => {
  const [activatedTabs, setActivatedTabs] = useState(new Set(initialActiveTabs));
  
  const markTabAsActivated = useCallback((tabName: string) => {
    setActivatedTabs(prev => {
      if (prev.has(tabName)) {
        return prev; // No change needed
      }
      console.log(`🏷️ TabLazyLoading: Marking ${tabName} as activated`);
      return new Set([...prev, tabName]);
    });
  }, []);
  
  const isTabActivated = useCallback((tabName: string) => {
    const isActivated = activatedTabs.has(tabName);
    return isActivated;
  }, [activatedTabs]);
  
  const getActivatedTabs = useCallback(() => {
    return Array.from(activatedTabs);
  }, [activatedTabs]);
  
  return { 
    markTabAsActivated, 
    isTabActivated,
    getActivatedTabs,
    activatedTabsCount: activatedTabs.size
  };
}; 