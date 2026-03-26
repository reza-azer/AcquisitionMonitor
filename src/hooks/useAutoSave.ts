import { useState, useEffect, useCallback, useRef } from 'react';

interface AutoSaveOptions {
  debounceMs?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn<T> {
  data: T;
  setData: (data: T) => void;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<boolean>;
  error: string | null;
}

/**
 * Custom hook for auto-saving data with debouncing
 * @param initialValue - Initial data value
 * @param saveFn - Async function to save data
 * @param options - Configuration options
 */
export function useAutoSave<T>(
  initialValue: T,
  saveFn: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
): UseAutoSaveReturn<T> {
  const { debounceMs = 2000, onSave, onError } = options;

  const [data, setData] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;

    setIsSaving(true);
    setError(null);

    try {
      await saveFn(dataRef.current);
      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error.message);
      onError?.(error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, saveFn, onSave, onError]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!isDirty) {
      setIsDirty(true);
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, isDirty, debounceMs, saveNow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    setData,
    isSaving,
    isDirty,
    lastSaved,
    saveNow,
    error,
  };
}
