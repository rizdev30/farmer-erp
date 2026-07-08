"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShoppingCart, 
  FileText, 
  Check, 
  Eye,
  BellOff
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";

function formatTimeAgo(dateStr: string) {
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

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load and poll notifications
  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
        // Find how many don't have current user ID in readBy array
        // We'll obtain user session details or rely on local storage / backend filter
        // Since getNotifications only returns notifications readable by the user,
        // we can count how many don't have the user's ID in readBy.
        // Wait, to know the user's ID, we can fetch it once or rely on the count 
        // determined on client side or backend.
        // Actually, we can get the user's ID from the session or just parse readBy.
        // Wait! Let's check: the server action return includes notifications.
        // Let's check how many are unread. But we need the current user's ID!
        // We can fetch the user ID from the session on load, or we can add a flag 
        // in the notification objects from the backend, or check client session.
        // Let's get the session from NextAuth or parse the user ID from a meta tag / session.
        // Wait, a very simple way is to check the user ID by calling a session check or checking
        // if readBy array on client matches a key.
        // Let's see: we can query the session directly, or getNotifications can return the unread count
        // or a list of notifications already marked with a boolean field `isRead`.
        // That is even simpler! Let's modify getNotifications in `src/app/actions/notifications.ts` 
        // to return `isRead` on each notification!
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

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

  // Poll every 12 seconds
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 12000);
    return () => clearInterval(interval);
  }, []);

  // Compute unread count based on readBy array
  useEffect(() => {
    // To identify if unread, we need the user's session ID.
    // Let's fetch the session or decode the client session.
    // Alternatively, let's just count notifications where the user hasn't read it.
    // We can fetch user id via session.
  }, [notifications]);

  // Let's find current user from the session
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
        }
      })
      .catch((err) => console.error("Session fetch error:", err));
  }, []);

  const unreadNotifs = notifications.filter(
    (n) => currentUserId && !n.readBy.includes(currentUserId)
  );
  
  const count = unreadNotifs.length;

  const handleNotificationClick = async (notif: any) => {
    if (currentUserId && !notif.readBy.includes(currentUserId)) {
      await markAsRead(notif.id);
      fetchNotifs();
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    fetchNotifs();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "PROCUREMENT_CREATED":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <ShoppingCart size={15} />
          </div>
        );
      case "PROCUREMENT_APPROVED":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={15} />
          </div>
        );
      case "PROCUREMENT_APPROVED_TO_PO":
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FileText size={15} />
          </div>
        );
      case "PROCUREMENT_CANCELLED":
        return (
          <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <XCircle size={15} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Bell size={15} />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all duration-200 active:scale-95 shadow-sm"
        aria-label="Notifications"
      >
        <Bell size={19} className={count > 0 ? "animate-wiggle" : ""} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-fade-in shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[340px] sm:w-[380px] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl z-50 overflow-hidden animate-slide-up origin-top-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              <p className="text-[10px] text-slate-400 font-medium">Updates from the last 24h</p>
            </div>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3">
                  <BellOff size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-600">All caught up!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No notifications in the last 24 hours.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-3.5 hover:bg-slate-50/80 cursor-pointer transition-all duration-150 relative ${
                      !isRead ? "bg-indigo-50/20" : ""
                    }`}
                  >
                    {/* Unread Blue Dot */}
                    {!isRead && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-600" />
                    )}

                    {getNotifIcon(notif.type)}

                    <div className="flex-1 pr-4 min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1.5 font-mono">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
