"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Lightweight SWR (Stale-While-Revalidate) cache for client-side data fetching.
 * 
 * Strategy:
 * 1. Return cached data instantly for fast page transitions
 * 2. Revalidate in background and update if data changed
 * 3. Only refetch when cache is stale (past TTL) or manually invalidated
 * 4. Mutation-aware: invalidate specific cache keys after create/update
 * 
 * Security: Cache is memory-only + sessionStorage (cleared on tab close).
 * No sensitive data persists beyond the session.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string; // quick hash to detect actual data changes
}

// In-memory cache (fastest) — survives client-side navigations in SPA
const memoryCache = new Map<string, CacheEntry<any>>();

// Default TTL: 5 minutes — pages won't re-fetch from DB unless stale or invalidated
const DEFAULT_TTL = 5 * 60 * 1000;

// SSR guard
const isBrowser = typeof window !== "undefined";

// ─── PRIORITY QUEUE FOR FETCHES ──────────────────────────────
// Ensures background pre-fetching doesn't block active user navigation
let activeHighPriorityCount = 0;
let activeLowPriorityCount = 0;
const lowPriorityQueue: Array<() => Promise<void>> = [];

function runNextLowPriority() {
  // Only run background tasks if no active user tasks and no background tasks are currently running
  if (activeHighPriorityCount > 0 || activeLowPriorityCount > 0) return;
  const next = lowPriorityQueue.shift();
  if (next) {
    activeLowPriorityCount++;
    next().finally(() => {
      activeLowPriorityCount--;
      runNextLowPriority();
    });
  }
}

async function executeHighPriority<T>(task: () => Promise<T>): Promise<T> {
  activeHighPriorityCount++;
  try {
    return await task();
  } finally {
    activeHighPriorityCount--;
    if (activeHighPriorityCount === 0) {
      setTimeout(runNextLowPriority, 100);
    }
  }
}

function enqueueLowPriority(task: () => Promise<void>) {
  lowPriorityQueue.push(task);
  runNextLowPriority();
}
// ─────────────────────────────────────────────────────────────

// Quick hash for data comparison
function quickHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Read from sessionStorage (survives full page reloads within same tab)
 */
function readSessionCache<T>(key: string): CacheEntry<T> | null {
  if (!isBrowser) return null;
  try {
    const raw = sessionStorage.getItem(`swr:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write to sessionStorage
 */
function writeSessionCache<T>(key: string, entry: CacheEntry<T>): void {
  if (!isBrowser) return;
  try {
    sessionStorage.setItem(`swr:${key}`, JSON.stringify(entry));
  } catch {
    // Storage full — silently fail, memory cache still works
  }
}

/**
 * Get cached data (memory first, then sessionStorage)
 */
function getCachedData<T>(key: string): CacheEntry<T> | null {
  // Memory cache is fastest
  const memEntry = memoryCache.get(key);
  if (memEntry) return memEntry;

  // Fall back to sessionStorage
  const sessionEntry = readSessionCache<T>(key);
  if (sessionEntry) {
    // Promote to memory cache
    memoryCache.set(key, sessionEntry);
    return sessionEntry;
  }

  return null;
}

/**
 * Set cache data in both memory and sessionStorage
 */
export function setCacheData<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    hash: quickHash(data),
  };
  memoryCache.set(key, entry);
  writeSessionCache(key, entry);
}

/**
 * Invalidate cache entries matching a pattern.
 * Used after mutations (create/update/delete).
 * 
 * @param pattern - Exact key or prefix with wildcard (e.g., "farmers-*")
 */
export function invalidateCache(pattern: string): void {
  const isWildcard = pattern.endsWith("*");
  const prefix = isWildcard ? pattern.slice(0, -1) : pattern;

  // Clear memory cache
  for (const key of Array.from(memoryCache.keys())) {
    if (isWildcard ? key.startsWith(prefix) : key === pattern) {
      memoryCache.delete(key);
    }
  }

  // Clear sessionStorage
  if (!isBrowser) return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const storageKey = sessionStorage.key(i);
      if (storageKey?.startsWith("swr:")) {
        const cacheKey = storageKey.slice(4);
        if (isWildcard ? cacheKey.startsWith(prefix) : cacheKey === pattern) {
          sessionStorage.removeItem(storageKey);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Prefetch data into cache without rendering.
 * Uses a low-priority queue to ensure active user navigation is never blocked.
 */
export function prefetchCache<T>(key: string, fetcher: () => Promise<T>): void {
  // Skip if already cached and fresh
  const existing = getCachedData<T>(key);
  if (existing && Date.now() - existing.timestamp < DEFAULT_TTL) return;

  enqueueLowPriority(async () => {
    // Check again right before execution in case it was fetched while waiting
    const current = getCachedData<T>(key);
    if (current && Date.now() - current.timestamp < DEFAULT_TTL) return;
    
    try {
      const data = await fetcher();
      setCacheData(key, data);
    } catch {
      // Prefetch failures are silent
    }
  });
}

/**
 * Hook: useSWRCache
 * 
 * Returns cached data instantly, then revalidates in background only if stale.
 * Only triggers re-render if the data actually changed.
 * 
 * Key behavior:
 * - If cache exists and is fresh → show cached data, NO fetch
 * - If cache exists but stale → show cached data immediately, fetch in background
 * - If no cache → show loading, fetch
 * - After mutation → invalidateCache() clears it, next mount will fetch
 */
export function useSWRCache<T>(
  key: string | null | undefined,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    revalidateOnFocus?: boolean;
    enabled?: boolean;
  }
): {
  data: T | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  mutate: (data?: T) => void;
  refetch: () => Promise<void>;
} {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const revalidateOnFocus = options?.revalidateOnFocus ?? true;
  const enabled = options?.enabled ?? true;

  // Initialize state — always start with undefined during SSR, read cache in useEffect
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const revalidate = useCallback(async () => {
    const currentKey = keyRef.current;
    if (!currentKey || !enabled) return;

    setIsValidating(true);
    try {
      // Wrap the fetcher in the high-priority queue
      const freshData = await executeHighPriority(fetcherRef.current);
      if (!mountedRef.current) return;

      const freshHash = quickHash(freshData);

      // Only update state if data actually changed
      const existingEntry = getCachedData<T>(currentKey);
      if (!existingEntry || existingEntry.hash !== freshHash) {
        setData(freshData);
      }

      // Always update cache timestamp
      setCacheData(currentKey, freshData);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error("Fetch failed"));
      // Keep stale data on error (graceful degradation)
    } finally {
      if (mountedRef.current) {
        setIsValidating(false);
        setIsLoading(false);
      }
    }
  }, [enabled]);

  // Initial fetch + stale check — runs on mount and when key changes
  useEffect(() => {
    if (!key || !enabled) {
      setIsLoading(false);
      return;
    }
    keyRef.current = key;

    const entry = getCachedData<T>(key);
    if (entry) {
      // Cache HIT — show cached data instantly, no loading state
      setData(entry.data);
      setIsLoading(false);

      // ALWAYS revalidate in background on navigation to ensure fresh data
      revalidate(); // Background refresh — UI already shows cached data
    } else {
      // Cache MISS — need to fetch
      setIsLoading(true);
      revalidate();
    }
  }, [key, ttl, revalidate, enabled]);

  // Revalidate on window focus (only if stale)
  useEffect(() => {
    if (!revalidateOnFocus || !key) return;

    function handleFocus() {
      const entry = getCachedData<T>(key!);
      const isStale = !entry || Date.now() - entry.timestamp > ttl;
      if (isStale) {
        revalidate();
      }
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [key, revalidateOnFocus, ttl, revalidate]);

  // Manual mutate (optimistic update)
  const mutate = useCallback(
    (newData?: T) => {
      if (!key) return;
      if (newData !== undefined) {
        setData(newData);
        setCacheData(key, newData);
      } else {
        revalidate();
      }
    },
    [key, revalidate]
  );

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate,
    refetch: revalidate,
  };
}
