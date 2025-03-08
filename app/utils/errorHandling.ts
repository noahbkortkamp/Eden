import * as Sentry from '@sentry/react-native';

export enum ErrorCode {
  // Auth related errors
  AUTH_INVALID_CREDENTIALS = 'auth/invalid-credentials',
  AUTH_EMAIL_NOT_VERIFIED = 'auth/email-not-verified',
  AUTH_SESSION_EXPIRED = 'auth/session-expired',
  
  // Review related errors
  REVIEW_ALREADY_EXISTS = 'review/already-exists',
  REVIEW_INVALID_DATA = 'review/invalid-data',
  REVIEW_UPLOAD_FAILED = 'review/upload-failed',
  
  // Course related errors
  COURSE_NOT_FOUND = 'course/not-found',
  COURSE_FETCH_FAILED = 'course/fetch-failed',
  
  // Network related errors
  NETWORK_OFFLINE = 'network/offline',
  NETWORK_TIMEOUT = 'network/timeout',
  
  // Generic errors
  UNKNOWN_ERROR = 'error/unknown'
}

export interface ErrorMetadata {
  userId?: string;
  courseId?: string;
  reviewId?: string;
  [key: string]: any;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public metadata?: ErrorMetadata
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = {
  handle: (error: unknown, metadata?: ErrorMetadata) => {
    if (error instanceof AppError) {
      // Log to console in development
      if (__DEV__) {
        console.error(`[${error.code}] ${error.message}`, {
          ...error.metadata,
          ...metadata,
        });
      }
      
      // Report to error tracking service in production
      if (!__DEV__) {
        Sentry.captureException(error, {
          extra: {
            ...error.metadata,
            ...metadata,
          },
        });
      }
      
      return error;
    }
    
    // Handle unknown errors
    const unknownError = new AppError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      ErrorCode.UNKNOWN_ERROR,
      metadata
    );
    
    if (__DEV__) {
      console.error('[UNKNOWN_ERROR]', error);
    } else {
      Sentry.captureException(error, {
        extra: metadata,
      });
    }
    
    return unknownError;
  },
  
  isNetworkError: (error: unknown): boolean => {
    if (error instanceof AppError) {
      return error.code === ErrorCode.NETWORK_OFFLINE || 
             error.code === ErrorCode.NETWORK_TIMEOUT;
    }
    return false;
  },
  
  isAuthError: (error: unknown): boolean => {
    if (error instanceof AppError) {
      return error.code.startsWith('auth/');
    }
    return false;
  },
  
  getUserFriendlyMessage: (error: unknown): string => {
    if (error instanceof AppError) {
      switch (error.code) {
        case ErrorCode.AUTH_INVALID_CREDENTIALS:
          return 'Invalid email or password. Please try again.';
        case ErrorCode.AUTH_EMAIL_NOT_VERIFIED:
          return 'Please verify your email address before continuing.';
        case ErrorCode.AUTH_SESSION_EXPIRED:
          return 'Your session has expired. Please sign in again.';
        case ErrorCode.REVIEW_ALREADY_EXISTS:
          return 'You have already reviewed this course for the selected date.';
        case ErrorCode.NETWORK_OFFLINE:
          return 'Please check your internet connection and try again.';
        case ErrorCode.NETWORK_TIMEOUT:
          return 'The request timed out. Please try again.';
        default:
          return error.message;
      }
    }
    return 'An unexpected error occurred. Please try again.';
  }
}; 