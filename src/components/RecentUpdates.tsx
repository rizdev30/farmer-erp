"use client";

import { useEffect, useState, useTransition } from "react";
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  ShoppingCart, 
  FileText, 
  ChevronRight, 
  Clock, 
  X 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead } from "@/app/actions/notifications";

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

function parseBoldText(text: string) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function RecentUpdates() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error("Error fetching updates:", err);
    }
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
        }
      })
      .catch((err) => console.error("Session error:", err));

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleItemClick = async (notif: any) => {
    if (currentUserId && !notif.readBy.includes(currentUserId)) {
      await markAsRead(notif.id);
      fetchNotifs();
    }
    setIsModalOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case "PROCUREMENT_CREATED":
        return {
          icon: <ShoppingCart size={15} />,
          bg: "bg-amber-50 border border-amber-100/50 text-amber-600",
        };
      case "PROCUREMENT_APPROVED":
        return {
          icon: <CheckCircle2 size={15} />,
          bg: "bg-emerald-50 border border-emerald-100/50 text-emerald-600",
        };
      case "PROCUREMENT_APPROVED_TO_PO":
        return {
          icon: <FileText size={15} />,
          bg: "bg-indigo-50 border border-indigo-100/50 text-indigo-600",
        };
      case "PROCUREMENT_CANCELLED":
        return {
          icon: <XCircle size={15} />,
          bg: "bg-red-50 border border-red-100/50 text-red-600",
        };
      default:
        return {
          icon: <Bell size={15} />,
          bg: "bg-slate-50 border border-slate-100/50 text-slate-600",
        };
    }
  };

  // Only display the latest 4 updates in the sidebar card
  const sidebarNotifs = notifications.slice(0, 4);

  return (
    <>
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 w-full border border-slate-200/40">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
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
        <div className="flex flex-col gap-3.5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 p-4">
              <Bell size={18} className="text-slate-300 mb-1.5" />
              <p className="text-[11px] font-semibold text-slate-500">No recent updates</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Live activities will appear here.</p>
            </div>
          ) : (
            sidebarNotifs.map((notif) => {
              const cfg = getIconConfig(notif.type);
              const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 cursor-pointer border ${
                    !isRead 
                      ? "bg-indigo-50/15 border-indigo-100/40 hover:bg-indigo-50/30" 
                      : "bg-white/40 border-transparent hover:bg-slate-50/50"
                  }`}
                >
                  <div className={`shrink-0 w-8.5 h-8.5 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-[11px] text-slate-600 leading-snug break-words">
                      {parseBoldText(notif.message)}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block mt-1">
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
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-5 md:p-6 modal-spring my-8 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">All Updates (Today)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Activity logs for the last 24 hours</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {notifications.map((notif) => {
                const cfg = getIconConfig(notif.type);
                const isRead = currentUserId ? notif.readBy.includes(currentUserId) : true;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`flex gap-3.5 py-3 hover:bg-slate-50/50 px-2.5 rounded-xl cursor-pointer transition-colors relative ${
                      !isRead ? "bg-indigo-50/20" : ""
                    }`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {parseBoldText(notif.message)}
                      </p>
                      <span className="text-[9.5px] text-slate-400 font-medium block mt-1.5 font-mono">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    {!isRead && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-600" />
                    )}
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
