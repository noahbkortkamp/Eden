import { useRef, useCallback } from 'react';

/**
 * 🚀 Performance: Custom hook for optimized button interactions
 * Prevents button lag, double-taps, and flashing issues
 */
export const useOptimizedButton = (
  onPress: (...args: any[]) => Promise<void> | void,
  debounceMs: number = 300
) => {
  const isProcessingRef = useRef(false);
  const lastPressTimeRef = useRef(0);

  const optimizedPress = useCallback(async (...args: any[]) => {
    const now = Date.now();
    
    // Prevent rapid double-taps and overlapping actions
    if (isProcessingRef.current || (now - lastPressTimeRef.current) < debounceMs) {
      console.log('🚫 Button press blocked - too fast or already processing');
      return;
    }
    
    try {
      isProcessingRef.current = true;
      lastPressTimeRef.current = now;
      
      await onPress(...args);
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      // Reset processing state after a short delay to prevent visual glitches
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  }, [onPress, debounceMs]);

  return {
    optimizedPress,
    isProcessing: () => isProcessingRef.current,
  };
}; 