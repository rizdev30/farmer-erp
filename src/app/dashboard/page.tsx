"use client";

import { useEffect } from "react";
import { getDashboardStats, getVarietyStats } from "@/app/actions/dashboard";
import type { VarietyStat } from "@/lib/crop-varieties";
import { useSession } from "next-auth/react";
import {
  Users,
  ShoppingCart,
  Scale,
  IndianRupee,
  ClipboardList,
  Settings as SettingsIcon,
  RefreshCw,
  Wheat,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";
import { useSWRCache, prefetchCache } from "@/lib/swr-cache";
import { getFarmers } from "@/app/actions/farmers";
import { getProcurementHistory, getMonthlySummary } from "@/app/actions/procurement";

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-IN");
}
function fmtCurrency(v: string | number | null | undefined) {
  const n = typeof v === "string" ? (parseFloat(v) || 0) : (v ?? 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────
// Stat row  ─ label + value side by side
// ─────────────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span
        className={`text-xs font-medium truncate ${
          highlight ? "text-forest-500" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-bold tabular-nums leading-tight ${
          highlight
            ? "text-forest-800 text-base"
            : "text-slate-700 text-sm md:text-base"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Divider between stat rows
// ─────────────────────────────────────────────────────────────
function VDiv() {
  return <div className="w-px self-stretch bg-slate-200/70 mx-1" />;
}

// ─────────────────────────────────────────────────────────────
// Grouped info card  ─ icon + title + row of stats
// ─────────────────────────────────────────────────────────────
function InfoCard({
  icon,
  title,
  iconBg,
  children,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      {/* card header */}
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700">{title}</span>
      </div>

      {/* stat values row */}
      {loading ? (
        <div className="flex gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-10 mx-auto" />
              <div className="h-5 bg-slate-200 rounded w-14 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start justify-around gap-1">{children}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();

  const {
    data: stats,
    isLoading,
    isValidating,
  } = useSWRCache("dashboard-stats", () => getDashboardStats(), {
    ttl: 5 * 60 * 1000,
    revalidateOnFocus: true,
  });

  const { data: varietyStats, isLoading: varietyLoading } = useSWRCache(
    "dashboard-variety-stats",
    () => getVarietyStats(),
    { ttl: 5 * 60 * 1000, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (!stats) return;
    prefetchCache("farmers-list---", () =>
      getFarmers({}).then((data) => data as any[])
    );
    prefetchCache("history-records---", () => getProcurementHistory({}));
    prefetchCache("history-summary-", () => getMonthlySummary());
  }, [stats]);

  const s = stats || {
    totalPurchase: 0,
    todayProcurements: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    totalPurchaseQtl: "0.00",
    todaysPurchaseQtl: "0.00",
    todaysAveragePrice: "0.00",
    totalBags: 0,
    todaysBags: 0,
    totalAveragePrice: "0.00",
  };

  const defaultVariety: VarietyStat[] = [
    "PB-1",
    "Pusa-1121",
    "Non Basmati",
    "Sarbati",
    "T.Basmati",
    "Type-3",
  ].map((v) => ({
    variety: v,
    bags: 0,
    weightQtl: "0.00",
    value: "0.00",
    avgCost: "0.00",
  }));

  const varieties = varietyStats || defaultVariety;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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

      {/* ── 3 Info Cards (prototype layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1 — Today Purchase */}
        <InfoCard
          icon={<ShoppingCart size={16} className="text-blue-600" />}
          title="Today Purchase"
          iconBg="bg-blue-100"
          loading={isLoading && !stats}
        >
          <StatRow label="Bags" value={fmt(s.todaysBags)} />
          <VDiv />
          <StatRow
            label="Weight Qtl."
            value={fmtCurrency(s.todaysPurchaseQtl)}
          />
          <VDiv />
          <StatRow
            label="Avg. Price"
            value={`₹${fmtCurrency(s.todaysAveragePrice)}`}
            highlight
          />
        </InfoCard>

        {/* 2 — Purchase Slip */}
        <InfoCard
          icon={<ClipboardList size={16} className="text-amber-600" />}
          title="Purchase Slip"
          iconBg="bg-amber-100"
          loading={isLoading && !stats}
        >
          <StatRow label="Total Slip" value={fmt(s.totalPurchase)} />
          <VDiv />
          <StatRow label="Approved" value={fmt(s.approved)} />
          <VDiv />
          <StatRow label="Awaiting" value={fmt(s.pendingApproval)} />
        </InfoCard>

        {/* 3 — Total Purchase */}
        <InfoCard
          icon={<TrendingUp size={16} className="text-forest-600" />}
          title="Total Purchase"
          iconBg="bg-forest-100"
          loading={isLoading && !stats}
        >
          <StatRow label="Bags" value={fmt(s.totalBags)} />
          <VDiv />
          <StatRow
            label="Weight Qtl."
            value={fmtCurrency(s.totalPurchaseQtl)}
          />
          <VDiv />
          <StatRow
            label="Avg. Price"
            value={`₹${fmtCurrency(s.totalAveragePrice)}`}
            highlight
          />
        </InfoCard>
      </div>

      {/* ── Crop Variety Summary ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
            <Wheat size={18} className="text-forest-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Crop Variety Summary
            </h2>
            <p className="text-xs text-slate-400">
              Total procurement by rice variety
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-forest-700 to-forest-600 text-white">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Variety
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">
                  Bags
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">
                  Weight
                  <br />
                  (Qtls)
                </th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">
                  Value
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Avg. Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {varietyLoading && !varietyStats
                ? [...Array(6)].map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 animate-pulse"
                    >
                      <td className="px-4 py-3">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded w-20 ml-auto" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                : varieties.map((row, i) => (
                    <tr
                      key={row.variety}
                      className={`border-b border-slate-100 transition-colors hover:bg-forest-50/40 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {row.variety}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                        {row.bags.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                        {parseFloat(row.weightQtl).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                        ₹
                        {parseFloat(row.value).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-forest-700 tabular-nums">
                        {parseFloat(row.avgCost) > 0
                          ? `₹${parseFloat(row.avgCost).toLocaleString(
                              "en-IN",
                              { minimumFractionDigits: 2 }
                            )}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Actions ── */}
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
                View history, monthly reports &amp; records
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
