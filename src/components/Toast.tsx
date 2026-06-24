"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { X, CheckCircle, AlertTriangle, Info, WifiOff, Loader2 } from "lucide-react";

// ======== Toast Types ========

export interface ToastData {
  id: string;
  type: "success" | "error" | "warning" | "info" | "offline";
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ======== Toast Context ========

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ======== Toast Provider ========

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const duration = toast.duration ?? (toast.type === "error" || toast.type === "offline" ? 8000 : 4000);

    setToasts((prev) => [...prev, { ...toast, id, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ======== Toast Container ========

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[200] space-y-2 print:hidden">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ======== Individual Toast ========

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
    error: <AlertTriangle size={18} className="text-red-500 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
    info: <Info size={18} className="text-blue-500 shrink-0" />,
    offline: <WifiOff size={18} className="text-amber-500 shrink-0" />,
  };

  const bgColors = {
    success: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
    offline: "bg-amber-50 border-amber-200",
  };

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        transition-all duration-200
        ${bgColors[toast.type]}
        ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
        animate-in slide-in-from-right-5
      `}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-600 mt-0.5">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-1 underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleRemove}
        className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
