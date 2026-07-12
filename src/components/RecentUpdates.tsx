"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  ShoppingCart, 
  FileText, 
  ChevronRight, 
  Clock, 
  X,
  UserPlus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead } from "@/app/actions/notifications";
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

function parseBoldText(text: string, isRead: boolean) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={`font-bold transition-colors ${isRead ? "text-slate-400" : "text-slate-800"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Notification type config — each type gets a distinct icon, color, and label
function getNotifConfig(type: string) {
  switch (type) {
    case "PROCUREMENT_CREATED":
      return {
        icon: <ShoppingCart size={14} strokeWidth={2.2} />,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-200/60",
        label: "New Procurement",
      };
    case "PROCUREMENT_APPROVED":
      return {
        icon: <CheckCircle2 size={14} strokeWidth={2.2} />,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        borderColor: "border-emerald-200/60",
        label: "Approved",
      };
    case "PROCUREMENT_APPROVED_TO_PO":
      return {
        icon: <FileText size={14} strokeWidth={2.2} />,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        borderColor: "border-indigo-200/60",
        label: "Ready for PO",
      };
    case "PROCUREMENT_CANCELLED":
      return {
        icon: <XCircle size={14} strokeWidth={2.2} />,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-200/60",
        label: "Cancelled",
      };
    case "FARMER_ADDED":
      return {
        icon: <UserPlus size={14} strokeWidth={2.2} />,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-200/60",
        label: "New Registration",
      };
    default:
      return {
        icon: <Bell size={14} strokeWidth={2.2} />,
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

export default function RecentUpdates() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Fetch notifications using SWR cache (shares with NotificationBell)
  const { data: notifRes, refetch } = useSWRCache(
    "notifications",
    async () => await getNotifications(),
    { ttl: 8000 }
  );

  const notifications = notifRes?.success ? notifRes.notifications || [] : [];

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
          setUserRoles(session.user.roles || []);
        }
      })
      .catch((err) => console.error("Session error:", err));

    // Poll every 8 seconds. Since we use useSWRCache, it will only result in one actual DB call
    const interval = setInterval(() => {
      refetch();
    }, 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleItemClick = async (notif: any) => {
    if (currentUserId && !notif.readBy.includes(currentUserId)) {
      await markAsRead(notif.id);
      invalidateCache("notifications");
      refetch();
    }
    setIsModalOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Only display the latest 4 updates in the sidebar card
  const sidebarNotifs = notifications.slice(0, 4);

  return (
    <>
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 w-full border border-slate-200/40">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-[15px] tracking-tight">Recent Updates</h3>
          {notifications.length > 0 && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-forest-600 hover:text-forest-700 font-bold transition-colors cursor-pointer"
            >
              View All
            </button>
          )}
        </div>

        {/* List of Updates */}
        <div className="flex flex-col gap-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 p-4">
              <Bell size={18} className="text-slate-300 mb-1.5" />
              <p className="text-[11px] font-semibold text-slate-500">No recent updates</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Live activities will appear here.</p>
            </div>
          ) : (
            sidebarNotifs.map((notif) => {
              const cfg = getNotifConfig(notif.type);
              const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
              const isImportant = isImportantNotification(notif, userRoles);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all duration-150 cursor-pointer border relative overflow-hidden ${
                    !isRead
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-slate-100/50 border-slate-200/20 hover:bg-slate-100/80 hover:border-slate-200/45"
                  }`}
                >
                  {/* Type Icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg ${
                    isRead ? "bg-slate-100 text-slate-400" : `${cfg.iconBg} ${cfg.iconColor}`
                  } flex items-center justify-center transition-colors`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    {/* Type label */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${
                        isRead ? "text-slate-400" : cfg.iconColor
                      } leading-none`}>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse mt-0.5" />
                      )}
                    </div>
                    <p className={`text-[11px] leading-snug break-words mt-0.5 transition-colors ${
                      isRead ? "text-slate-400 font-medium" : "text-slate-700 font-semibold"
                    }`}>
                      {parseBoldText(notif.message, isRead)}
                    </p>
                    <span className={`text-[9px] font-medium block mt-1 transition-colors ${
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
      </div>

      {/* View All Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-fade" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#f2f2f7] rounded-3xl shadow-2xl modal-spring my-8 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shrink-0">
              <h3 className="text-[15px] font-bold text-slate-800">All Updates</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.map((notif) => {
                const cfg = getNotifConfig(notif.type);
                const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
                const isImportant = isImportantNotification(notif, userRoles);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 active:scale-[0.98] border relative overflow-hidden ${
                      !isRead
                        ? "bg-white border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                        : "bg-slate-100/50 border-slate-200/20 hover:bg-slate-100/80 hover:border-slate-200/40"
                    }`}
                  >
                    {/* Type Icon */}
                    <div className={`shrink-0 w-9 h-9 rounded-xl ${
                      isRead ? "bg-slate-100 text-slate-400" : `${cfg.iconBg} ${cfg.iconColor}`
                    } flex items-center justify-center transition-colors`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      {/* Type label + unread dot */}
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
                      <p className={`text-xs leading-relaxed transition-colors ${
                        isRead ? "text-slate-400 font-medium" : "text-slate-700 font-semibold"
                      }`}>
                        {parseBoldText(notif.message, isRead)}
                      </p>
                      <span className={`text-[9.5px] font-medium block mt-1 font-mono transition-colors ${
                        isRead ? "text-slate-300" : "text-slate-400"
                      }`}>
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
