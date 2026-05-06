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

  useEffect(() => {
    if (!isDirty) {
      setIsDirty(true);
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, isDirty, debounceMs, saveNow]);

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
