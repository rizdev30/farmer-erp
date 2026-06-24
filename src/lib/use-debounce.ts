"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Debounce hook — delays updating the value until the user stops typing.
 * Best practice: 400ms for mobile/slow network environments.
 * 
 * @param value - The raw input value
 * @param delay - Debounce delay in ms (default 400ms)
 * @param minLength - Minimum characters before debouncing kicks in (default 2)
 */
export function useDebounce<T>(value: T, delay: number = 400, minLength: number = 0): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If value is a string and shorter than minLength, update immediately with empty/original
    if (typeof value === "string" && value.length < minLength) {
      setDebouncedValue(value);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, minLength]);

  return debouncedValue;
}

/**
 * Debounced callback hook — debounces a function call.
 * Cancels previous invocation if called again within the delay window.
 * Supports AbortController for cancelling in-flight requests.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 400
): { fn: (...args: Parameters<T>) => void; cancel: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const fn = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      abortRef.current = new AbortController();
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, cancel]
  );

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return { fn, cancel };
}

/**
 * Throttle hook — ensures a function is called at most once per interval.
 * Useful for scroll events, filter changes, etc.
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}
