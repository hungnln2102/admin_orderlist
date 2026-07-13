import { useState, useCallback, useEffect } from "react";

export interface UseApiQueryOptions<T> {
  /** If true, the query won't execute immediately */
  lazy?: boolean;
  /** Optional initial data */
  initialData?: T;
  /** Called on success */
  onSuccess?: (data: T) => void;
  /** Called on error */
  onError?: (err: Error) => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  options?: UseApiQueryOptions<T>
) {
  const [data, setData] = useState<T | undefined>(options?.initialData);
  const [loading, setLoading] = useState<boolean>(!options?.lazy);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        setData(result);
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      } catch (err) {
        const parsedError = err instanceof Error ? err : new Error(String(err));
        setError(parsedError);
        if (options?.onError) {
          options.onError(parsedError);
        }
        throw parsedError;
      } finally {
        setLoading(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    if (!options?.lazy) {
      execute().catch(() => {});
    }
  }, [execute, options?.lazy]);

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
  };
}
