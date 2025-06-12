import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderCount: number;
  subscriptionCount: number;
  errorCount: number;
  lastUpdate: number;
}

interface UsePerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  logInterval?: number; // How often to log metrics (in ms)
}

/**
 * Performance monitoring hook for real-time components
 * Tracks render counts, subscription status, and error frequencies
 */
export function usePerformanceMonitor({
  componentName,
  enabled = __DEV__, // Only enable in development by default
  logInterval = 30000, // Log every 30 seconds
}: UsePerformanceMonitorProps) {
  const metricsRef = useRef<PerformanceMetrics>({
    componentName,
    mountTime: Date.now(),
    renderCount: 0,
    subscriptionCount: 0,
    errorCount: 0,
    lastUpdate: Date.now(),
  });

  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track render count
  useEffect(() => {
    if (enabled) {
      metricsRef.current.renderCount++;
      metricsRef.current.lastUpdate = Date.now();
    }
  });

  // Start performance logging
  useEffect(() => {
    if (!enabled) return;

    console.log(`📊 Performance Monitor started for ${componentName}`);

    logIntervalRef.current = setInterval(() => {
      const metrics = metricsRef.current;
      const uptime = Date.now() - metrics.mountTime;
      const avgRenderTime = uptime / Math.max(metrics.renderCount, 1);

      console.log(`📊 Performance Report: ${componentName}`, {
        uptime: `${Math.round(uptime / 1000)}s`,
        renderCount: metrics.renderCount,
        avgRenderTime: `${Math.round(avgRenderTime)}ms`,
        subscriptionCount: metrics.subscriptionCount,
        errorCount: metrics.errorCount,
        lastUpdate: new Date(metrics.lastUpdate).toLocaleTimeString(),
      });

      // Alert for performance issues
      if (metrics.renderCount > 100 && avgRenderTime < 100) {
        console.warn(`⚠️ High render frequency detected in ${componentName}: ${metrics.renderCount} renders`);
      }

      if (metrics.errorCount > 5) {
        console.warn(`⚠️ High error count detected in ${componentName}: ${metrics.errorCount} errors`);
      }

      if (metrics.subscriptionCount > 3) {
        console.warn(`⚠️ Multiple subscriptions detected in ${componentName}: ${metrics.subscriptionCount} active`);
      }
    }, logInterval);

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
      }
      
      const finalMetrics = metricsRef.current;
      const totalUptime = Date.now() - finalMetrics.mountTime;
      console.log(`📊 Final Performance Report: ${componentName}`, {
        totalUptime: `${Math.round(totalUptime / 1000)}s`,
        totalRenders: finalMetrics.renderCount,
        totalErrors: finalMetrics.errorCount,
        maxSubscriptions: finalMetrics.subscriptionCount,
      });
    };
  }, [enabled, componentName, logInterval]);

  // Return tracking functions
  return {
    trackSubscription: useCallback((action: 'add' | 'remove') => {
      if (enabled) {
        if (action === 'add') {
          metricsRef.current.subscriptionCount++;
        } else {
          metricsRef.current.subscriptionCount = Math.max(0, metricsRef.current.subscriptionCount - 1);
        }
      }
    }, [enabled]),

    trackError: useCallback((error: Error) => {
      if (enabled) {
        metricsRef.current.errorCount++;
        console.error(`📊 Error tracked in ${componentName}:`, error.message);
      }
    }, [enabled, componentName]),

    getMetrics: useCallback(() => {
      return { ...metricsRef.current };
    }, []),

    logManual: useCallback((message: string, data?: any) => {
      if (enabled) {
        console.log(`📊 ${componentName}: ${message}`, data);
      }
    }, [enabled, componentName]),
  };
} 