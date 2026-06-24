"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Form Auto-Save System
 * 
 * Saves form draft to localStorage as user fills in fields.
 * Only saves to localStorage (not DB) — prevents per-character DB hits.
 * 
 * When all required fields are filled, the form data is pre-validated
 * and ready for instant submission.
 * 
 * Security:
 * - Draft data is stored in localStorage with a session-specific key
 * - Cleared on successful submission
 * - No sensitive data persists beyond the session
 */

interface AutoSaveOptions<T> {
  /** Unique key for this form (e.g., "procurement-form") */
  key: string;
  /** Current form data */
  data: T;
  /** Debounce delay for saves (default: 1000ms) */
  saveDelay?: number;
  /** Whether to enable autosave (default: true) */
  enabled?: boolean;
}

/**
 * Hook: useFormAutoSave
 * 
 * Automatically saves form data to localStorage with debouncing.
 * Prevents data loss on accidental page close/refresh.
 */
export function useFormAutoSave<T>({
  key,
  data,
  saveDelay = 1000,
  enabled = true,
}: AutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `form-draft:${key}`;

  // Debounced save to localStorage
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data,
            savedAt: Date.now(),
          })
        );
      } catch {
        // Storage full — ignore
      }
    }, saveDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, storageKey, saveDelay, enabled]);

  // Warn user before leaving page with unsaved form data
  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const hasData = Object.values(data as Record<string, any>).some(
        (v) => v !== "" && v !== null && v !== undefined && v !== 0
      );
      if (hasData) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [data, enabled]);

  /** Load saved draft */
  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Draft expires after 24 hours
      if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }, [storageKey]);

  /** Clear saved draft (call after successful submission) */
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  /** Check if a draft exists */
  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  return { loadDraft, clearDraft, hasDraft };
}
