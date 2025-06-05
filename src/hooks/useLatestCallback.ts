import { useRef, useLayoutEffect, useEffect } from 'react';

/**
 * Use `useEffect` during SSR and `useLayoutEffect` in the browser/React Native
 * to avoid hydration warnings and ensure synchronous updates.
 */
const useIsomorphicLayoutEffect = 
  typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * React hook that returns the latest callback without changing the reference.
 * 
 * This is useful when you need a stable callback reference that always calls
 * the most recent version of the callback function. Prevents stale closures
 * in useEffect dependencies and similar scenarios.
 * 
 * @template T - The callback function type
 * @param callback - The callback function to wrap
 * @returns A stable reference to a function that always calls the latest callback
 * 
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * 
 * const handleClick = useLatestCallback(() => {
 *   console.log('Current count:', count); // Always logs the latest count
 * });
 * 
 * useEffect(() => {
 *   // handleClick reference never changes, so this effect won't re-run
 *   const interval = setInterval(handleClick, 1000);
 *   return () => clearInterval(interval);
 * }, [handleClick]);
 * ```
 */
export default function useLatestCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  // Store the latest callback in a ref
  const callbackRef = useRef(callback);
  
  // Create a stable wrapper function that calls the latest callback
  const stableCallback = useRef<T>(
    (function stableCallback(this: any, ...args: Parameters<T>): ReturnType<T> {
      // Always call the most recent callback with preserved `this` context
      return callbackRef.current.apply(this, args);
    }) as T
  ).current;
  
  // Update the ref whenever the callback changes
  // Use isomorphic layout effect to ensure synchronous updates
  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });
  
  return stableCallback;
}

/**
 * Type-only export for consumers who need the function type
 */
export type UseLatestCallback = typeof useLatestCallback; 