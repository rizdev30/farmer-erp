import { getDashboardStats } from "@/app/actions/dashboard";
import { auth } from "@/auth";
import {
  Users,
  ShoppingCart,
  Scale,
  IndianRupee,
  ClipboardList,
  Settings as SettingsIcon,
} from "lucide-react";
import BentoGrid from "@/components/BentoGrid";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  const bentoStats = [
    {
      title: "Total Purchase",
      value: stats.totalPurchase,
      subtitle: "All time",
      icon: <ShoppingCart size={20} className="text-forest-700" />,
      gradient: "bg-gradient-to-br from-forest-100 to-forest-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Today's Procurements",
      value: stats.todayProcurements,
      subtitle: "Transactions today",
      icon: <ShoppingCart size={20} className="text-blue-700" />,
      gradient: "bg-gradient-to-br from-blue-100 to-blue-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Pending Approval",
      value: stats.pendingApproval,
      subtitle: "Pending review",
      icon: <ClipboardList size={20} className="text-amber-700" />,
      gradient: "bg-gradient-to-br from-amber-100 to-amber-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Approved",
      value: stats.approved,
      subtitle: "Successfully approved",
      icon: <ClipboardList size={20} className="text-green-700" />,
      gradient: "bg-gradient-to-br from-green-100 to-green-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Total Purchase in Qtl.",
      value: stats.totalPurchaseQtl,
      subtitle: "All time",
      icon: <Scale size={20} className="text-purple-700" />,
      gradient: "bg-gradient-to-br from-purple-100 to-purple-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Today's Purchase in Qtl.",
      value: stats.todaysPurchaseQtl,
      subtitle: "Today",
      icon: <Scale size={20} className="text-indigo-700" />,
      gradient: "bg-gradient-to-br from-indigo-100 to-indigo-200",
      span: "sm:col-span-1 lg:col-span-2",
    },
    {
      title: "Today's Average Price",
      value: `₹${stats.todaysAveragePrice}`,
      subtitle: "Average Rate",
      icon: <IndianRupee size={20} className="text-rose-700" />,
      gradient: "bg-gradient-to-br from-rose-100 to-rose-200",
      span: "sm:col-span-2 lg:col-span-4", // Making the 7th item span full width or more
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
          <p className="text-slate-500 mt-1">
            Here&apos;s your procurement overview
          </p>
        </div>
        <CommandBar />
      </div>

      {/* Stats Grid */}
      <BentoGrid stats={bentoStats} />

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
