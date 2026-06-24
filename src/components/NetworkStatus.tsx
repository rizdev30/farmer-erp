"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, WifiOff, CloudOff, Loader2, Cloud } from "lucide-react";
import {
  detectNetworkQuality,
  syncQueue,
  getQueueCount,
  migrateFromLocalStorage,
  type NetworkStatus,
} from "@/lib/offline-sync";
import { createProcurement } from "@/app/actions/procurement";
import { useToast } from "@/components/Toast";
import { invalidateCache } from "@/lib/swr-cache";

/**
 * Global Network Status Monitor & Auto-Sync Engine
 * 
 * - Continuously monitors network quality
 * - Auto-syncs offline data when network improves
 * - Shows persistent banner when offline
 * - Migrates old localStorage data on first load
 */
export default function NetworkStatusMonitor() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("online");
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();
  const initializedRef = useRef(false);

  // Sync function that maps queue items to server actions
  const performSync = useCallback(async (type: string, payload: any) => {
    if (type === "procurement") {
      await createProcurement(payload);
    }
    // Add more types as needed (e.g., "farmer" → registerFarmer)
  }, []);

  // Attempt sync
  const attemptSync = useCallback(async () => {
    const count = await getQueueCount();
    if (count === 0) return;

    const netStatus = await detectNetworkQuality();
    if (netStatus === "offline") return;

    setSyncing(true);
    try {
      const { synced, failed } = await syncQueue(performSync);

      if (synced > 0) {
        // Invalidate caches so pages show fresh data
        invalidateCache("dashboard-*");
        invalidateCache("history-*");

        addToast({
          type: "success",
          title: `${synced} offline record${synced > 1 ? "s" : ""} synced!`,
          message: "Your data has been saved to the server successfully.",
          duration: 5000,
        });
      }

      if (failed > 0) {
        addToast({
          type: "warning",
          title: `${failed} record${failed > 1 ? "s" : ""} failed to sync`,
          message: "Will retry automatically when network improves.",
          duration: 6000,
        });
      }
    } catch (err) {
      console.error("Sync attempt failed:", err);
    }

    setSyncing(false);
    const newCount = await getQueueCount();
    setQueueCount(newCount);
  }, [performSync, addToast]);

  // Schedule periodic sync attempts
  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      await attemptSync();
      // Re-schedule if there are still items
      const count = await getQueueCount();
      if (count > 0) {
        scheduleSync();
      }
    }, 30000); // Check every 30 seconds
  }, [attemptSync]);

  // Monitor network status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function checkNetwork() {
      const status = await detectNetworkQuality();
      setNetworkStatus((prev) => {
        if (prev !== status) {
          // Network changed
          if (status === "online" && (prev === "offline" || prev === "slow")) {
            // Network came back — attempt sync
            attemptSync();
            addToast({
              type: "success",
              title: "Back online!",
              message: "Checking for offline data to sync...",
              duration: 3000,
            });
          } else if (status === "offline" && prev === "online") {
            addToast({
              type: "offline",
              title: "You're offline",
              message: "Don't worry — your data will be saved locally and synced automatically.",
              duration: 0, // Persistent until online
            });
          }
        }
        return status;
      });
    }

    // Check every 15 seconds
    checkNetwork();
    interval = setInterval(checkNetwork, 15000);

    // Also listen for browser online/offline events
    const handleOnline = () => {
      checkNetwork();
    };
    const handleOffline = () => {
      setNetworkStatus("offline");
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [attemptSync, addToast]);

  // Initial setup: migrate from localStorage + check queue
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      // Migrate old localStorage data to IndexedDB
      const migrated = await migrateFromLocalStorage();
      if (migrated > 0) {
        addToast({
          type: "info",
          title: `Migrated ${migrated} offline record${migrated > 1 ? "s" : ""}`,
          message: "Your offline data has been upgraded for better reliability.",
          duration: 5000,
        });
      }

      // Check current queue
      const count = await getQueueCount();
      setQueueCount(count);
      if (count > 0) {
        setShowBanner(true);
        scheduleSync();
      }
    }

    init().catch(console.error);
  }, [addToast, scheduleSync]);

  // Update queue count periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getQueueCount();
      setQueueCount(count);
      setShowBanner(count > 0 || networkStatus !== "online");
    }, 10000);
    return () => clearInterval(interval);
  }, [networkStatus]);

  // Don't render anything if everything is fine
  if (!showBanner && networkStatus === "online" && queueCount === 0) {
    return null;
  }

  return (
    <div className="print:hidden">
      {/* Offline/Slow banner */}
      {(networkStatus !== "online" || queueCount > 0) && (
        <div
          className={`fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[150]
            px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3
            ${networkStatus === "offline"
              ? "bg-red-50 border-red-200"
              : networkStatus === "slow"
              ? "bg-amber-50 border-amber-200"
              : "bg-blue-50 border-blue-200"
            }
          `}
        >
          {syncing ? (
            <Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />
          ) : networkStatus === "offline" ? (
            <WifiOff size={18} className="text-red-500 shrink-0" />
          ) : networkStatus === "slow" ? (
            <CloudOff size={18} className="text-amber-500 shrink-0" />
          ) : (
            <Cloud size={18} className="text-blue-500 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">
              {syncing
                ? "Syncing data..."
                : networkStatus === "offline"
                ? "No internet connection"
                : networkStatus === "slow"
                ? "Slow network detected"
                : `${queueCount} pending sync`}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {syncing
                ? "Please keep the app open."
                : queueCount > 0
                ? `${queueCount} record${queueCount > 1 ? "s" : ""} saved offline. Will auto-sync.`
                : "Data will be saved locally until network recovers."}
            </p>
          </div>

          {queueCount > 0 && networkStatus === "online" && !syncing && (
            <button
              onClick={attemptSync}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
