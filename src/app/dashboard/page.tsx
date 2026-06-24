"use client";

import { useEffect } from "react";
import { getDashboardStats } from "@/app/actions/dashboard";
import { useSession } from "next-auth/react";
import {
  Users,
  ShoppingCart,
  Scale,
  IndianRupee,
  ClipboardList,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import BentoGrid from "@/components/BentoGrid";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";
import { useSWRCache, prefetchCache } from "@/lib/swr-cache";
import { getFarmers } from "@/app/actions/farmers";
import { getProcurementHistory, getMonthlySummary } from "@/app/actions/procurement";

export default function DashboardPage() {
  const { data: session } = useSession();

  // SWR cached dashboard stats — shows cached data instantly, revalidates in background
  const {
    data: stats,
    isLoading,
    isValidating,
    refetch,
  } = useSWRCache(
    "dashboard-stats",
    () => getDashboardStats(),
    { ttl: 5 * 60 * 1000, revalidateOnFocus: true }
  );

  // After dashboard loads, prefetch other pages in background so they open instantly
  useEffect(() => {
    if (!stats) return; // Wait for dashboard to load first

    // Prefetch farmers list (default filters)
    prefetchCache("farmers-list---", () =>
      getFarmers({}).then((data) => data as any[])
    );

    // Prefetch procurement history (no filters)
    prefetchCache("history-records---", () =>
      getProcurementHistory({})
    );

    // Prefetch monthly summary
    prefetchCache("history-summary-", () =>
      getMonthlySummary()
    );
  }, [stats]);

  // Default stats for initial render
  const s = stats || {
    totalPurchase: 0,
    todayProcurements: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    totalPurchaseQtl: "0.00",
    todaysPurchaseQtl: "0.00",
    todaysAveragePrice: "0.00",
  };

  const bentoStats = [
    // Line 1
    {
      title: "Total Purchase",
      value: s.totalPurchase,
      subtitle: "All time",
      icon: <ShoppingCart size={20} className="text-forest-700" />,
      gradient: "bg-gradient-to-br from-forest-100 to-forest-200",
      span: "col-span-1 lg:col-span-2",
    },
    {
      title: "Today's Purchase",
      value: s.todayProcurements,
      subtitle: "Transactions today",
      icon: <ShoppingCart size={20} className="text-blue-700" />,
      gradient: "bg-gradient-to-br from-blue-100 to-blue-200",
      span: "col-span-1 lg:col-span-2",
    },
    // Line 2
    {
      title: "Total Purchase (Qtl)",
      value: s.totalPurchaseQtl,
      subtitle: "All time quantity",
      icon: <Scale size={20} className="text-purple-700" />,
      gradient: "bg-gradient-to-br from-purple-100 to-purple-200",
      span: "col-span-1 lg:col-span-2",
    },
    {
      title: "Today's Purchase (Qtl)",
      value: s.todaysPurchaseQtl,
      subtitle: "Today's quantity",
      icon: <Scale size={20} className="text-indigo-700" />,
      gradient: "bg-gradient-to-br from-indigo-100 to-indigo-200",
      span: "col-span-1 lg:col-span-2",
    },
    // Line 3
    {
      title: "Approved",
      value: s.approved,
      subtitle: "Successfully approved",
      icon: <ClipboardList size={20} className="text-green-700" />,
      gradient: "bg-gradient-to-br from-green-100 to-green-200",
      span: "col-span-1 lg:col-span-2",
    },
    {
      title: "Pending Approval",
      value: s.pendingApproval,
      subtitle: "Pending review",
      icon: <ClipboardList size={20} className="text-amber-700" />,
      gradient: "bg-gradient-to-br from-amber-100 to-amber-200",
      span: "col-span-1 lg:col-span-2",
    },
    // Line 4
    {
      title: "Approval Cancelled",
      value: s.rejected,
      subtitle: "Rejected records",
      icon: <ClipboardList size={20} className="text-red-700" />,
      gradient: "bg-gradient-to-br from-red-100 to-red-200",
      span: "col-span-2 lg:col-span-4",
    },
    // Line 5
    {
      title: "Today's Average Price",
      value: `₹${s.todaysAveragePrice}`,
      subtitle: "Average Rate",
      icon: <IndianRupee size={20} className="text-rose-700" />,
      gradient: "bg-gradient-to-br from-rose-100 to-rose-200",
      span: "col-span-2 lg:col-span-4",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Welcome back, {session?.user?.name || "Agent"}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Here&apos;s your procurement overview
            {isValidating && (
              <RefreshCw size={12} className="animate-spin text-forest-500" />
            )}
          </p>
        </div>
        <CommandBar />
      </div>

      {/* Stats Grid */}
      {isLoading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <BentoGrid stats={bentoStats} />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/procurement"
          className="glass-card rounded-2xl p-6 group"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-forest-500 to-forest-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-forest-700 transition-colors">
                New Procurement
              </h3>
              <p className="text-sm text-slate-500">
                Record a new purchase transaction
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/farmers"
          className="glass-card rounded-2xl p-6 group"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                Manage Farmers
              </h3>
              <p className="text-sm text-slate-500">
                View, search, or register new farmers
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/history"
          className="glass-card rounded-2xl p-6 group"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <ClipboardList size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                Procurement Records
              </h3>
              <p className="text-sm text-slate-500">
                View history, monthly reports & records
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/settings"
          className="glass-card rounded-2xl p-6 group md:hidden"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <SettingsIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-slate-600 transition-colors">
                App Settings
              </h3>
              <p className="text-sm text-slate-500">
                View account info and sign out
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
