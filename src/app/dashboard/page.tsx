import { getDashboardStats } from "@/app/actions/dashboard";
import { auth } from "@/auth";
import {
  Users,
  ShoppingCart,
  Scale,
  IndianRupee,
} from "lucide-react";
import BentoGrid from "@/components/BentoGrid";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  const bentoStats = [
    {
      title: "Total Farmers",
      value: stats.totalFarmers,
      subtitle: "Registered suppliers",
      icon: <Users size={20} className="text-forest-700" />,
      gradient: "bg-gradient-to-br from-forest-100 to-forest-200",
    },
    {
      title: "Today's Procurements",
      value: stats.todayProcurements,
      subtitle: "Transactions today",
      icon: <ShoppingCart size={20} className="text-blue-700" />,
      gradient: "bg-gradient-to-br from-blue-100 to-blue-200",
    },
    {
      title: "Total Procurement",
      value: `${stats.totalQuantity} Qtl`,
      subtitle: "In Quintals",
      icon: <Scale size={20} className="text-amber-700" />,
      gradient: "bg-gradient-to-br from-amber-100 to-amber-200",
    },
    {
      title: "Total Payout",
      value: stats.totalPayout,
      subtitle: "All time",
      icon: <IndianRupee size={20} className="text-purple-700" />,
      gradient: "bg-gradient-to-br from-purple-100 to-purple-200",
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
            <div className="w-12 h-12 bg-gradient-to-br from-forest-500 to-forest-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
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
      </div>
    </div>
  );
}
