import { useState, useEffect, useCallback } from 'react';
import { errorHandler, AppError, ErrorMetadata } from '../utils/errorHandling';

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  refetch: () => Promise<void>;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  metadata?: ErrorMetadata
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const handledError = errorHandler.handle(err, metadata);
      setError(handledError);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, ...dependencies]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn();
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          const handledError = errorHandler.handle(err, metadata);
          setError(handledError);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    execute();

    return () => {
      mounted = false;
    };
  }, [fetchFn, ...dependencies]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
} 