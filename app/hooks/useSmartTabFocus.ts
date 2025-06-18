import { useState, useCallback, useRef } from 'react';

interface TabCacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

interface SmartTabFocusOptions {
  cacheDuration?: number; // Cache duration in milliseconds
  backgroundRefreshThreshold?: number; // Time after which to trigger background refresh
  enableBackgroundRefresh?: boolean;
}

export const useSmartTabFocus = <T>(
  tabName: string,
  fetchData: () => Promise<T>,
  cacheKey: string,
  options: SmartTabFocusOptions = {}
) => {
  const {
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    backgroundRefreshThreshold = 2 * 60 * 1000, // 2 minutes default
    enableBackgroundRefresh = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const cacheRef = useRef<Map<string, TabCacheEntry<T>>>(new Map());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isCacheValid = useCallback((entry: TabCacheEntry<T>): boolean => {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < cacheDuration;
  }, [cacheDuration]);
  
  const shouldRefresh = useCallback((): boolean => {
    const cache = cacheRef.current.get(cacheKey);
    if (!cache) return true;
    
    const now = Date.now();
    const isExpired = !isCacheValid(cache);
    const hasBeenTooLong = (now - lastFetch) > cacheDuration;
    
    return isExpired || hasBeenTooLong;
  }, [cacheKey, cacheDuration, lastFetch, isCacheValid]);

  const shouldBackgroundRefresh = useCallback((): boolean => {
    if (!enableBackgroundRefresh) return false;
    
    const cache = cacheRef.current.get(cacheKey);
    if (!cache) return false;
    
    const now = Date.now();
    const age = now - cache.timestamp;
    return age > backgroundRefreshThreshold && age < cacheDuration;
  }, [cacheKey, backgroundRefreshThreshold, cacheDuration, enableBackgroundRefresh]);
  
  const performFetch = useCallback(async (isBackground = false): Promise<T | null> => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setBackgroundRefreshing(true);
    }
    
    try {
      console.log(`🔄 SmartTabFocus [${tabName}]: ${isBackground ? 'Background' : 'Foreground'} fetch starting`);
      const result = await fetchData();
      
      setData(result);
      setLastFetch(Date.now());
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        version: 1
      });
      
      console.log(`✅ SmartTabFocus [${tabName}]: ${isBackground ? 'Background' : 'Foreground'} fetch completed`);
      return result;
    } catch (error) {
      console.error(`❌ SmartTabFocus [${tabName}]: Error during ${isBackground ? 'background' : 'foreground'} fetch:`, error);
      return null;
    } finally {
      if (!isBackground) {
        setLoading(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, [fetchData, tabName, cacheKey]);
  
  const loadData = useCallback(async (force = false): Promise<void> => {
    // Clear any pending timeouts
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    
    if (!force && !shouldRefresh()) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        console.log(`💾 SmartTabFocus [${tabName}]: Using cached data (age: ${Date.now() - cached.timestamp}ms)`);
        setData(cached.data);
        
        // Check if we should do background refresh
        if (shouldBackgroundRefresh()) {
          console.log(`🔄 SmartTabFocus [${tabName}]: Triggering background refresh`);
          // Delay background refresh to not block UI
          fetchTimeoutRef.current = setTimeout(() => {
            performFetch(true);
          }, 100);
        }
        return;
      }
    }
    
    console.log(`🚀 SmartTabFocus [${tabName}]: Performing ${force ? 'forced' : 'normal'} fetch`);
    await performFetch(false);
  }, [shouldRefresh, cacheKey, tabName, shouldBackgroundRefresh, performFetch]);
  
  const refresh = useCallback(async (): Promise<void> => {
    console.log(`🔄 SmartTabFocus [${tabName}]: Manual refresh requested`);
    await loadData(true);
  }, [loadData, tabName]);
  
  const clearCache = useCallback((): void => {
    console.log(`🗑️ SmartTabFocus [${tabName}]: Clearing cache`);
    cacheRef.current.delete(cacheKey);
    setData(null);
    setLastFetch(0);
  }, [cacheKey, tabName]);
  
  const getCacheInfo = useCallback(() => {
    const cache = cacheRef.current.get(cacheKey);
    if (!cache) return null;
    
    const now = Date.now();
    const age = now - cache.timestamp;
    const isValid = isCacheValid(cache);
    
    return {
      age,
      isValid,
      timestamp: cache.timestamp,
      version: cache.version
    };
  }, [cacheKey, isCacheValid]);
  
  return { 
    data, 
    loading, 
    backgroundRefreshing,
    loadData, 
    refresh, 
    clearCache,
    getCacheInfo,
    isCached: cacheRef.current.has(cacheKey)
  };
}; 