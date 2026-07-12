"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShoppingCart, 
  FileText, 
  Check, 
  Eye,
  BellOff,
  UserPlus,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import { useSWRCache, invalidateCache } from "@/lib/swr-cache";

function formatTimeAgo(dateStr: any) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Notification type config — each type gets a distinct icon, color, and label
function getNotifConfig(type: string) {
  switch (type) {
    case "PROCUREMENT_CREATED":
      return {
        icon: <ShoppingCart size={15} strokeWidth={2.2} />,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-200/60",
        label: "New Procurement",
      };
    case "PROCUREMENT_APPROVED":
      return {
        icon: <CheckCircle2 size={15} strokeWidth={2.2} />,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        borderColor: "border-emerald-200/60",
        label: "Approved",
      };
    case "PROCUREMENT_APPROVED_TO_PO":
      return {
        icon: <FileText size={15} strokeWidth={2.2} />,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        borderColor: "border-indigo-200/60",
        label: "Ready for PO",
      };
    case "PROCUREMENT_CANCELLED":
      return {
        icon: <XCircle size={15} strokeWidth={2.2} />,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-200/60",
        label: "Cancelled",
      };
    case "FARMER_ADDED":
      return {
        icon: <UserPlus size={15} strokeWidth={2.2} />,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-200/60",
        label: "New Registration",
      };
    default:
      return {
        icon: <Bell size={15} strokeWidth={2.2} />,
        iconBg: "bg-slate-100",
        iconColor: "text-slate-500",
        borderColor: "border-slate-200/60",
        label: "Update",
      };
  }
}

function isImportantNotification(notif: any, roles: string[]) {
  if (notif.type === "ADHATIYA_ADDED") {
    return true;
  }
  if (roles.includes("L2_APPROVAL") && notif.type === "PROCUREMENT_CREATED") {
    return true;
  }
  if (roles.includes("L1_AGENT") && (notif.type === "PROCUREMENT_APPROVED" || notif.type === "PROCUREMENT_CANCELLED")) {
    return true;
  }
  if (roles.includes("L3_PO_MAKER") && notif.type === "PROCUREMENT_APPROVED_TO_PO") {
    return true;
  }
  if ((roles.includes("L4_ADMIN") || roles.includes("SUPERADMIN")) && (notif.type === "PROCUREMENT_APPROVED" || notif.type === "ADHATIYA_ADDED")) {
    return true;
  }
  return false;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Fetch notifications using SWR cache (shares with RecentUpdates)
  const { data: notifRes, refetch } = useSWRCache(
    "notifications",
    async () => await getNotifications(),
    { ttl: 15000 }
  );

  const notifications = notifRes?.success ? notifRes.notifications || [] : [];

  // Get current user ID from session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
          setUserRoles(session.user.roles || []);
        }
      })
      .catch((err) => console.error("Session fetch error:", err));
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Poll every 15 seconds. Since we use useSWRCache, it will only result in one actual DB call
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const unreadNotifs = notifications.filter(
    (n) => currentUserId && !n.readBy.includes(currentUserId)
  );
  
  const count = unreadNotifs.length;

  const handleNotificationClick = async (notif: any) => {
    if (currentUserId && !notif.readBy.includes(currentUserId)) {
      await markAsRead(notif.id);
      invalidateCache("notifications");
      refetch();
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    invalidateCache("notifications");
    refetch();
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button — compact on mobile, blends with header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 active:bg-slate-100 transition-all duration-150 active:scale-95"
        aria-label="Notifications"
        style={{ minHeight: "36px", minWidth: "36px" }}
      >
        <Bell size={18} className={count > 0 ? "animate-wiggle" : ""} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1.5 ring-white shadow-sm"
            style={{ lineHeight: 1 }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 sm:hidden backdrop-fade" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Popover Dropdown — full-screen sheet on mobile, positioned dropdown on desktop */}
      {isOpen && (
        <div 
          className="
            fixed inset-0 z-50 w-full h-[100dvh]
            bg-white flex flex-col overflow-hidden
            animate-mobile-slide-up
            sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2
            sm:w-[380px] sm:h-auto sm:max-h-[75vh]
            sm:rounded-2xl sm:border sm:border-slate-200/80 sm:shadow-xl
            sm:animate-slide-up sm:origin-top-right
          "
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 sm:px-4 sm:py-3 border-b border-slate-100 shrink-0 bg-white">
            <h3 className="font-bold text-slate-800 text-base sm:text-[15px]">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-forest-600 hover:text-forest-700 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check size={12} />
                  Read all
                </button>
              )}
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3 space-y-2 bg-[#f5f5f7]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2.5">
                  <BellOff size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-500">All caught up!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No new notifications.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
                const cfg = getNotifConfig(notif.type);
                const isImportant = isImportantNotification(notif, userRoles);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 active:scale-[0.98] border relative overflow-hidden ${
                      !isRead
                        ? "bg-white border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                        : "bg-slate-100/50 border-slate-200/20 hover:bg-slate-100/80 hover:border-slate-200/40"
                    }`}
                  >
                    {/* Type Icon */}
                    <div className={`w-9 h-9 rounded-xl ${
                      isRead ? "bg-slate-100 text-slate-400" : `${cfg.iconBg} ${cfg.iconColor}`
                    } flex items-center justify-center shrink-0 transition-colors`}>
                      {cfg.icon}
                    </div>
 
                    <div className="flex-1 min-w-0 pr-1">
                      {/* Type label */}
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          isRead ? "text-slate-400" : cfg.iconColor
                        }`}>
                          {cfg.label}
                        </span>
                        {isImportant && (
                          <span className={`text-[7.5px] font-extrabold uppercase px-1 py-0.5 rounded leading-none scale-[0.9] origin-left transition-colors ${
                            isRead ? "bg-slate-200 text-slate-500" : "bg-amber-500 text-white"
                          }`}>
                            Important
                          </span>
                        )}
                        {!isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-[11.5px] leading-snug transition-colors ${
                        isRead ? "font-medium text-slate-400" : "font-bold text-slate-800"
                      }`}>
                        {notif.title}
                      </p>
                      <p className={`text-[10.5px] mt-0.5 leading-snug line-clamp-2 transition-colors ${
                        isRead ? "text-slate-400" : "text-slate-600"
                      }`}>
                        {notif.message}
                      </p>
                      <span className={`text-[9px] font-medium block mt-1 font-mono transition-colors ${
                        isRead ? "text-slate-300" : "text-slate-400"
                      }`}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Safe area bottom padding on mobile */}
          <div className="sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
        </div>
      )}
    </div>
  );
}
