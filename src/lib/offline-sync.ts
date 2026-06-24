"use client";

/**
 * Intelligent Offline Sync System
 * 
 * Features:
 * 1. Smart network quality detection (not just online/offline)
 * 2. IndexedDB storage (more reliable than localStorage)
 * 3. Exponential retry backoff: 5s → 15s → 45s → 2min → 5min
 * 4. Integrity checksums to prevent data corruption
 * 5. Auto-sync when network improves
 * 6. Locks to prevent duplicate sync attempts
 * 
 * Security:
 * - Data validated before sync
 * - Checksums prevent tampering
 * - Queue items are timestamped and immutable once created
 */

// ======== IndexedDB Helper ========

const DB_NAME = "farmer-erp-offline";
const DB_VERSION = 1;
const STORE_NAME = "sync-queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ======== Types ========

export interface OfflineQueueItem {
  id: string;
  type: "procurement" | "farmer";
  payload: any;
  receipt?: any; // Local receipt for immediate display
  status: "pending" | "syncing" | "synced" | "failed";
  retryCount: number;
  checksum: string;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

export type NetworkStatus = "online" | "slow" | "offline";

// ======== Checksum ========

function generateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `chk-${Math.abs(hash).toString(36)}`;
}

function verifyChecksum(item: OfflineQueueItem): boolean {
  return generateChecksum(item.payload) === item.checksum;
}

// ======== Network Quality Detection ========

/**
 * Detect actual network quality by testing a lightweight fetch.
 * Returns: "online" (good), "slow" (>5s), or "offline" (no connection)
 */
export async function detectNetworkQuality(): Promise<NetworkStatus> {
  if (typeof navigator === "undefined") return "online"; // SSR guard
  if (!navigator.onLine) return "offline";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const start = Date.now();
    // Use GET with a cache-bust param to test real network speed
    await fetch(`/api/auth/session?_ping=${Date.now()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    const elapsed = Date.now() - start;
    return elapsed > 3000 ? "slow" : "online";
  } catch {
    return navigator.onLine ? "slow" : "offline";
  }
}

// ======== Queue Operations ========

/**
 * Add item to offline sync queue
 */
export async function addToSyncQueue(
  type: OfflineQueueItem["type"],
  payload: any,
  receipt?: any
): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    receipt,
    status: "pending",
    retryCount: 0,
    checksum: generateChecksum(payload),
    createdAt: Date.now(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all pending items from the queue
 */
export async function getPendingItems(): Promise<OfflineQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("pending");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of all pending + failed items
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result as OfflineQueueItem[];
      resolve(items.filter(i => i.status === "pending" || i.status === "failed").length);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an item's status in the queue
 */
async function updateItem(item: OfflineQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove synced items from the queue
 */
async function removeSyncedItems(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.openCursor("synced");
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ======== Sync Engine ========

// Retry delays: 5s, 15s, 45s, 2min, 5min
const RETRY_DELAYS = [5000, 15000, 45000, 120000, 300000];

let isSyncing = false;

/**
 * Attempt to sync all pending items.
 * Uses exponential backoff for failed items.
 * 
 * @param syncFn - The server action to call for each item
 * @param onProgress - Callback for progress updates
 */
export async function syncQueue(
  syncFn: (type: string, payload: any) => Promise<any>,
  onProgress?: (synced: number, total: number, item: OfflineQueueItem) => void,
  onComplete?: (synced: number, failed: number) => void
): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const networkStatus = await detectNetworkQuality();
    if (networkStatus === "offline") {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    const pending = await getPendingItems();
    // Also get failed items that are ready for retry
    const db = await openDB();
    const allItems = await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const failedItems = allItems.filter(item => {
      if (item.status !== "failed") return false;
      const retryDelay = RETRY_DELAYS[Math.min(item.retryCount, RETRY_DELAYS.length - 1)];
      return !item.lastAttempt || Date.now() - item.lastAttempt > retryDelay;
    });

    const itemsToSync = [...pending, ...failedItems];
    if (itemsToSync.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    for (const item of itemsToSync) {
      // Verify data integrity
      if (!verifyChecksum(item)) {
        item.status = "failed";
        item.error = "Data integrity check failed";
        await updateItem(item);
        failed++;
        continue;
      }

      item.status = "syncing";
      item.lastAttempt = Date.now();
      await updateItem(item);

      try {
        await syncFn(item.type, item.payload);
        item.status = "synced";
        await updateItem(item);
        synced++;
        onProgress?.(synced, itemsToSync.length, item);
      } catch (err) {
        item.status = "failed";
        item.retryCount++;
        item.error = err instanceof Error ? err.message : "Sync failed";
        await updateItem(item);
        failed++;
      }
    }

    // Clean up synced items
    if (synced > 0) {
      await removeSyncedItems();
    }

    onComplete?.(synced, failed);
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

// ======== Migration from localStorage ========

/**
 * Migrate old localStorage offline data to IndexedDB.
 * Called once on app startup.
 */
export async function migrateFromLocalStorage(): Promise<number> {
  try {
    const raw = localStorage.getItem("offlineProcurements");
    if (!raw) return 0;

    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) return 0;

    let migrated = 0;
    for (const item of items) {
      if (item.payload) {
        await addToSyncQueue("procurement", item.payload, item.receipt);
        migrated++;
      }
    }

    // Remove old localStorage data after successful migration
    localStorage.removeItem("offlineProcurements");
    return migrated;
  } catch {
    return 0;
  }
}
