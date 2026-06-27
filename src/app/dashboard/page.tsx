"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { getDashboardStats, getVarietyStats, getVarietyDetail } from "@/app/actions/dashboard";
import type { VarietyStat, DashboardStats, VarietyRecord } from "@/lib/crop-varieties";
import { useSession } from "next-auth/react";
import {
  Users,
  ShoppingCart,
  ClipboardList,
  Settings as SettingsIcon,
  RefreshCw,
  Wheat,
  TrendingUp,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";
import { useSWRCache, prefetchCache } from "@/lib/swr-cache";
import { getFarmers } from "@/app/actions/farmers";
import { getProcurementHistory, getMonthlySummary } from "@/app/actions/procurement";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-IN");
}
function fmtCurrency(v: string | number | null | undefined) {
  const n = typeof v === "string" ? (parseFloat(v) || 0) : (v ?? 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    APPROVED:     { label: "Approved",  cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 size={11} /> },
    PENDING_L2:   { label: "Pending",   cls: "bg-amber-100 text-amber-700",  icon: <Clock size={11} /> },
    PENDING_L3:   { label: "Pending",   cls: "bg-amber-100 text-amber-700",  icon: <Clock size={11} /> },
    REJECTED_L2:  { label: "Rejected",  cls: "bg-red-100 text-red-700",      icon: <XCircle size={11} /> },
    REJECTED_L3:  { label: "Rejected",  cls: "bg-red-100 text-red-700",      icon: <XCircle size={11} /> },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat row
// ─────────────────────────────────────────────────────────────
function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className={`text-xs font-medium truncate ${highlight ? "text-forest-500" : "text-slate-400"}`}>{label}</span>
      <span className={`font-bold tabular-nums leading-tight ${highlight ? "text-forest-800 text-base" : "text-slate-700 text-sm md:text-base"}`}>{value}</span>
    </div>
  );
}
function VDiv() {
  return <div className="w-px self-stretch bg-slate-200/70 mx-1" />;
}

// ─────────────────────────────────────────────────────────────
// Info card
// ─────────────────────────────────────────────────────────────
function InfoCard({ icon, title, iconBg, children, loading }: {
  icon: React.ReactNode; title: string; iconBg: string;
  children: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
        <span className="text-sm font-bold text-slate-700">{title}</span>
      </div>
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
// Three info cards — accepts any DashboardStats object
// ─────────────────────────────────────────────────────────────
function ThreeCards({ s, loading }: { s: DashboardStats; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <InfoCard icon={<ShoppingCart size={16} className="text-blue-600" />} title="Today Purchase" iconBg="bg-blue-100" loading={loading}>
        <StatRow label="Bags"        value={fmt(s.todaysBags)} />
        <VDiv />
        <StatRow label="Weight Qtl." value={fmtCurrency(s.todaysPurchaseQtl)} />
        <VDiv />
        <StatRow label="Avg. Price"  value={`₹${fmtCurrency(s.todaysAveragePrice)}`} highlight />
      </InfoCard>

      <InfoCard icon={<ClipboardList size={16} className="text-amber-600" />} title="Purchase Slip" iconBg="bg-amber-100" loading={loading}>
        <StatRow label="Total Slip" value={fmt(s.totalPurchase)} />
        <VDiv />
        <StatRow label="Approved"   value={fmt(s.approved)} />
        <VDiv />
        <StatRow label="Awaiting"   value={fmt(s.pendingApproval)} />
      </InfoCard>

      <InfoCard icon={<TrendingUp size={16} className="text-forest-600" />} title="Total Purchase" iconBg="bg-forest-100" loading={loading}>
        <StatRow label="Bags"        value={fmt(s.totalBags)} />
        <VDiv />
        <StatRow label="Weight Qtl." value={fmtCurrency(s.totalPurchaseQtl)} />
        <VDiv />
        <StatRow label="Avg. Price"  value={`₹${fmtCurrency(s.totalAveragePrice)}`} highlight />
      </InfoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty stats placeholder
// ─────────────────────────────────────────────────────────────
const EMPTY_STATS: DashboardStats = {
  totalPurchase: 0, todayProcurements: 0, pendingApproval: 0, approved: 0,
  rejected: 0, totalPurchaseQtl: "0.00", todaysPurchaseQtl: "0.00",
  todaysAveragePrice: "0.00", totalBags: 0, todaysBags: 0, totalAveragePrice: "0.00",
};

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();

  // Global dashboard stats
  const { data: stats, isLoading, isValidating } = useSWRCache(
    "dashboard-stats",
    () => getDashboardStats(),
    { ttl: 5 * 60 * 1000, revalidateOnFocus: true }
  );

  // Variety summary table
  const { data: varietyStats, isLoading: varietyLoading } = useSWRCache(
    "dashboard-variety-stats",
    () => getVarietyStats(),
    { ttl: 5 * 60 * 1000, revalidateOnFocus: true }
  );

  // Drill-down state
  const [selectedVariety, setSelectedVariety] = useState<string | null>(null);
  const [drillStats, setDrillStats]   = useState<DashboardStats>(EMPTY_STATS);
  const [drillRecords, setDrillRecords] = useState<VarietyRecord[]>([]);
  const [isPending, startTransition]  = useTransition();

  // Prefetch background pages after stats load
  useEffect(() => {
    if (!stats) return;
    prefetchCache("farmers-list---", () => getFarmers({}).then((d) => d as any[]));
    prefetchCache("history-records---", () => getProcurementHistory({}));
    prefetchCache("history-summary-", () => getMonthlySummary());
  }, [stats]);

  // Click a variety row → fetch drill-down data
  const handleVarietyClick = useCallback((variety: string) => {
    setSelectedVariety(variety);
    setDrillRecords([]);
    startTransition(async () => {
      const detail = await getVarietyDetail(variety);
      setDrillStats(detail.stats);
      setDrillRecords(detail.records);
    });
  }, []);

  const s = stats || EMPTY_STATS;
  const defaultVariety: VarietyStat[] = ["PB-1", "Pusa-1121", "Non Basmati", "Sarbati", "T.Basmati", "Type-3"]
    .map((v) => ({ variety: v, bags: 0, weightQtl: "0.00", value: "0.00", avgCost: "0.00" }));
  const varieties = varietyStats || defaultVariety;

  // ── DRILL-DOWN VIEW ──────────────────────────────────────────
  if (selectedVariety) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedVariety(null)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center shrink-0">
              <Wheat size={16} className="text-forest-700" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight truncate">
                {selectedVariety}
              </h1>
              <p className="text-xs text-slate-400">Variety drill-down</p>
            </div>
          </div>
          {isPending && <Loader2 size={16} className="animate-spin text-forest-500 ml-auto shrink-0" />}
        </div>

        {/* Filtered stats cards */}
        <ThreeCards s={drillStats} loading={isPending && drillRecords.length === 0} />

        {/* Records list */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Purchase Records</h2>
              <p className="text-xs text-slate-400">{selectedVariety} · {drillRecords.length} records</p>
            </div>
          </div>

          {/* Loading skeleton */}
          {isPending && drillRecords.length === 0 ? (
            <div className="divide-y divide-slate-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 bg-slate-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-36" />
                    <div className="h-3 bg-slate-100 rounded w-24" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-4 bg-slate-200 rounded w-20 ml-auto" />
                    <div className="h-3 bg-slate-100 rounded w-14 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : drillRecords.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Wheat size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No records found</p>
              <p className="text-slate-300 text-xs mt-1">No procurement has been recorded for {selectedVariety}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {drillRecords.map((rec) => (
                <div key={rec.id} className="px-5 py-4 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-forest-100 flex items-center justify-center shrink-0 text-forest-700 font-bold text-sm">
                    {rec.farmerName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{rec.farmerName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {rec.farmerCode && <span className="font-mono">{rec.farmerCode} · </span>}
                      {rec.village || rec.agentName}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="text-sm font-bold text-slate-700 tabular-nums">
                      ₹{fmtCurrency(rec.total)}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {fmt(rec.bags)} bags · {fmtCurrency(rec.weightQtl)} Qtl
                    </p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <StatusBadge status={rec.status} />
                      <span className="text-[10px] text-slate-300">{fmtDate(rec.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD VIEW ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Welcome back, {session?.user?.name || "Agent"}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Here&apos;s your procurement overview
            {isValidating && <RefreshCw size={12} className="animate-spin text-forest-500" />}
          </p>
        </div>
        <CommandBar />
      </div>

      {/* 3 Info Cards */}
      <ThreeCards s={s} loading={isLoading && !stats} />

      {/* Crop Variety Summary — rows are clickable filters */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
            <Wheat size={18} className="text-forest-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-800">Crop Variety Summary</h2>
            <p className="text-xs text-slate-400">Tap a variety to filter records</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-forest-700 to-forest-600 text-white">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Variety</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">Bags</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">Weight<br />(Qtls)</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide">Value</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Avg. Cost</th>
                <th className="px-3 py-3 w-6" />
              </tr>
            </thead>
            <tbody>
              {varietyLoading && !varietyStats
                ? [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-12 ml-auto" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-12 ml-auto" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded w-20 ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                      <td className="px-3 py-3" />
                    </tr>
                  ))
                : varieties.map((row, i) => (
                    <tr
                      key={row.variety}
                      onClick={() => handleVarietyClick(row.variety)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors active:bg-forest-100/60 hover:bg-forest-50/60 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-forest-700">{row.variety}</td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{row.bags.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                        {parseFloat(row.weightQtl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">
                        ₹{parseFloat(row.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-forest-700 tabular-nums">
                        {parseFloat(row.avgCost) > 0
                          ? `₹${parseFloat(row.avgCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/procurement" className="glass-card rounded-2xl p-6 group">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-forest-500 to-forest-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-forest-700 transition-colors">New Procurement</h3>
              <p className="text-sm text-slate-500">Record a new purchase transaction</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/farmers" className="glass-card rounded-2xl p-6 group">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">Manage Farmers</h3>
              <p className="text-sm text-slate-500">View, search, or register new farmers</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/history" className="glass-card rounded-2xl p-6 group">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <ClipboardList size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">Procurement Records</h3>
              <p className="text-sm text-slate-500">View history, monthly reports &amp; records</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings" className="glass-card rounded-2xl p-6 group md:hidden">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <SettingsIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-slate-600 transition-colors">App Settings</h3>
              <p className="text-sm text-slate-500">View account info and sign out</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
