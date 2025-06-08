import { Alert, Platform } from 'react-native';

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private static isInitialized = false;

  private constructor() {}

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  public static initialize() {
    if (GlobalErrorHandler.isInitialized) {
      return;
    }

    console.log('🛡️ GlobalErrorHandler: Initializing comprehensive error handling...');
    
    const handler = GlobalErrorHandler.getInstance();
    
    // 1. Catch unhandled Promise rejections
    handler.setupUnhandledRejectionHandler();
    
    // 2. Catch global JavaScript errors
    handler.setupGlobalErrorHandler();
    
    // 3. Setup console error interception
    handler.setupConsoleErrorHandler();
    
    // 4. Add performance monitoring
    handler.setupPerformanceMonitoring();

    GlobalErrorHandler.isInitialized = true;
    console.log('✅ GlobalErrorHandler: All error handlers initialized');
  }

  private setupUnhandledRejectionHandler() {
    // Catch unhandled Promise rejections (async/await errors, API failures, etc.)
    const originalHandler = global.HermesInternal?.hasPromiseRejectionTracker?.() ? 
      global.HermesInternal.enablePromiseRejectionTracker : null;

    global.addEventListener?.('unhandledrejection', (event) => {
      console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
      console.error('🚨 Promise:', event.promise);
      
      if (!__DEV__) {
        this.showProductionAlert('Unhandled Promise Rejection', event.reason);
      }
      
      // Prevent the error from being logged to console again
      event.preventDefault();
    });

    console.log('✅ Unhandled rejection handler set up');
  }

  private setupGlobalErrorHandler() {
    // Catch global JavaScript errors that happen outside React
    const originalErrorHandler = global.ErrorUtils?.getGlobalHandler?.();
    
    global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      console.error('🚨 GLOBAL JS ERROR:', error);
      console.error('🚨 Is Fatal:', isFatal);
      console.error('🚨 Stack:', error.stack);
      
      if (!__DEV__) {
        this.showProductionAlert('Global JavaScript Error', error, isFatal);
      }

      // Call original handler if it exists
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    console.log('✅ Global error handler set up');
  }

  private setupConsoleErrorHandler() {
    // Intercept console.error to catch errors that might not be caught elsewhere
    const originalConsoleError = console.error;
    
    console.error = (...args: any[]) => {
      // Log to original console first
      originalConsoleError.apply(console, args);
      
      // Check if this looks like an important error
      const errorString = args.join(' ');
      if (this.isImportantError(errorString)) {
        console.log('🔍 Important error detected in console:', errorString);
        
        if (!__DEV__) {
          // Only show alerts for critical errors to avoid spam
          if (this.isCriticalError(errorString)) {
            this.showProductionAlert('Console Error', errorString);
          }
        }
      }
    };

    console.log('✅ Console error handler set up');
  }

  private setupPerformanceMonitoring() {
    // Monitor app performance and memory issues
    if (global.performance?.mark) {
      global.performance.mark('app-start');
      
      setTimeout(() => {
        try {
          global.performance?.mark('app-ready');
          if (global.performance?.measure) {
            global.performance.measure('app-startup', 'app-start', 'app-ready');
            console.log('📊 App startup performance measured');
          }
        } catch (error) {
          console.warn('Performance monitoring error:', error);
        }
      }, 5000);
    }

    console.log('✅ Performance monitoring set up');
  }

  private isImportantError(errorString: string): boolean {
    const importantPatterns = [
      'Fatal',
      'ReferenceError',
      'TypeError',
      'SyntaxError',
      'Network request failed',
      'Unable to resolve module',
      'Metro'
    ];
    
    return importantPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isCriticalError(errorString: string): boolean {
    const criticalPatterns = [
      'Fatal',
      'Unable to resolve module',
      'Metro',
      'Bundle',
      'JavaScript'
    ];
    
    return criticalPatterns.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private showProductionAlert(title: string, error: any, isFatal?: boolean) {
    // Only show alerts in development mode to prevent blocking production UI
    if (!__DEV__) {
      console.error(`${title}:`, error);
      return;
    }

    const errorString = typeof error === 'string' ? error : 
                       error?.message || 
                       error?.toString() || 
                       'Unknown error';
    
    Alert.alert(
      title,
      errorString,
      [
        {
          text: 'OK',
          style: 'default'
        }
      ],
      { cancelable: true }
    );
  }

  // Static method to manually report errors from try/catch blocks
  public static reportError(error: Error | string, context?: string) {
    const handler = GlobalErrorHandler.getInstance();
    console.error(`🚨 MANUAL ERROR REPORT${context ? ` (${context})` : ''}:`, error);
    
    if (!__DEV__) {
      handler.showProductionAlert(
        `Manual Report${context ? ` - ${context}` : ''}`, 
        error
      );
    }
  }

  // Helper for wrapping async functions
  public static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T, 
    context: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        GlobalErrorHandler.reportError(error as Error, context);
        throw error; // Re-throw so calling code can handle it
      }
    }) as T;
  }

  // Helper for wrapping regular functions
  public static wrapSync<T extends (...args: any[]) => any>(
    fn: T, 
    context: string
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        GlobalErrorHandler.reportError(error as Error, context);
        throw error; // Re-throw so calling code can handle it
      }
    }) as T;
  }
} 