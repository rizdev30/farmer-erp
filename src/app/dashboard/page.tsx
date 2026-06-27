"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { getDashboardStats, getVarietyStats, getVarietyDetail, getTodayDetail, getAllSlipsDetail } from "@/app/actions/dashboard";
import type { VarietyStat, DashboardStats, VarietyRecord, SlipRecord, SlipStats } from "@/lib/crop-varieties";
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
  Calendar,
  FileText
} from "lucide-react";
import CommandBar from "@/components/CommandBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
// Info card wrapper (clickable)
// ─────────────────────────────────────────────────────────────
function InfoCard({ icon, title, iconBg, children, loading, onClick, className = "" }: {
  icon: React.ReactNode; title: string; iconBg: string;
  children: React.ReactNode; loading?: boolean; onClick?: () => void; className?: string;
}) {
  const Component = onClick ? "button" : "div";
  return (
    <Component 
      onClick={onClick} 
      className={`glass-card rounded-2xl p-4 flex flex-col gap-3 text-left w-full ${onClick ? "cursor-pointer hover:bg-slate-50/50 transition-colors active:bg-slate-100/50" : ""} ${className}`}
    >
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
        <div className="flex items-start justify-around gap-1 w-full">{children}</div>
      )}
    </Component>
  );
}

// ─────────────────────────────────────────────────────────────
// Three info cards (Main Dashboard / Variety Drill / Today Drill)
// ─────────────────────────────────────────────────────────────
function ThreeCards({ s, loading, onTodayClick, onSlipClick, onTotalClick, hideTotalPurchase }: { 
  s: DashboardStats; 
  loading: boolean;
  onTodayClick?: () => void;
  onSlipClick?: () => void;
  onTotalClick?: () => void;
  hideTotalPurchase?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 ${hideTotalPurchase ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-4`}>
      <InfoCard 
        icon={<ShoppingCart size={16} className="text-blue-600" />} 
        title="Today Purchase" 
        iconBg="bg-blue-100" 
        loading={loading}
        onClick={onTodayClick}
      >
        <StatRow label="Bags"        value={fmt(s.todaysBags)} />
        <VDiv />
        <StatRow label="Weight Qtl." value={fmtCurrency(s.todaysPurchaseQtl)} />
        <VDiv />
        <StatRow label="Avg. Price"  value={`₹${fmtCurrency(s.todaysAveragePrice)}`} highlight />
      </InfoCard>

      <InfoCard 
        icon={<ClipboardList size={16} className="text-amber-600" />} 
        title="Purchase Slip" 
        iconBg="bg-amber-100" 
        loading={loading}
        onClick={onSlipClick}
      >
        <StatRow label="Total Slip" value={fmt(s.totalPurchase)} />
        <VDiv />
        <StatRow label="Approved"   value={fmt(s.approved)} />
        <VDiv />
        <StatRow label="Awaiting"   value={fmt(s.pendingApproval)} />
      </InfoCard>

      {!hideTotalPurchase && (
        <InfoCard 
          icon={<TrendingUp size={16} className="text-forest-600" />} 
          title="Total Purchase" 
          iconBg="bg-forest-100" 
          loading={loading}
          onClick={onTotalClick}
        >
          <StatRow label="Bags"        value={fmt(s.totalBags)} />
          <VDiv />
          <StatRow label="Weight Qtl." value={fmtCurrency(s.totalPurchaseQtl)} />
          <VDiv />
          <StatRow label="Avg. Price"  value={`₹${fmtCurrency(s.totalAveragePrice)}`} highlight />
        </InfoCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Slip Stats Cards (Slips Drill-down)
// ─────────────────────────────────────────────────────────────
function SlipStatsCards({ s, loading }: { s: SlipStats; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 col-span-1 sm:col-span-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-100"><FileText size={16} className="text-indigo-600" /></div>
          <span className="text-sm font-bold text-slate-700">All Slips Overview</span>
        </div>
        {loading ? (
          <div className="flex gap-3 animate-pulse">
            <div className="flex-1 space-y-1.5"><div className="h-3 bg-slate-200 rounded w-10" /><div className="h-5 bg-slate-200 rounded w-14" /></div>
            <div className="flex-1 space-y-1.5"><div className="h-3 bg-slate-200 rounded w-10" /><div className="h-5 bg-slate-200 rounded w-14" /></div>
          </div>
        ) : (
          <div className="flex items-start justify-around gap-1 w-full">
            <StatRow label="Total Slips" value={fmt(s.total)} highlight />
            <VDiv />
            <StatRow label="Total Bags" value={fmt(s.totalBags)} />
            <VDiv />
            <StatRow label="Total Qtl" value={fmtCurrency(s.totalWeightQtl)} />
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-green-100"><CheckCircle2 size={16} className="text-green-600" /></div>
          <span className="text-sm font-bold text-slate-700">Approved</span>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-1.5"><div className="h-3 bg-slate-200 rounded w-10" /><div className="h-5 bg-slate-200 rounded w-14" /></div>
        ) : (
          <div className="flex flex-col"><span className="text-2xl font-bold text-green-700">{fmt(s.approved)}</span></div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-100"><Clock size={16} className="text-amber-600" /></div>
          <span className="text-sm font-bold text-slate-700">Awaiting</span>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-1.5"><div className="h-3 bg-slate-200 rounded w-10" /><div className="h-5 bg-slate-200 rounded w-14" /></div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex flex-col"><span className="text-2xl font-bold text-amber-700">{fmt(s.awaiting)}</span></div>
            {s.cancelled > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Cancelled</span>
                <span className="text-sm font-bold text-red-600">{fmt(s.cancelled)}</span>
              </div>
            )}
          </div>
        )}
      </div>
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

const EMPTY_SLIP_STATS: SlipStats = {
  total: 0, approved: 0, awaiting: 0, cancelled: 0, totalBags: 0, totalWeightQtl: "0.00", totalValue: "0.00"
};

type ViewMode = 
  | { type: "main" }
  | { type: "variety", value: string }
  | { type: "today" }
  | { type: "slips" };

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

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

  // Drill-down states
  const [viewMode, setViewMode] = useState<ViewMode>({ type: "main" });
  const [drillStats, setDrillStats] = useState<DashboardStats>(EMPTY_STATS);
  const [drillSlipStats, setDrillSlipStats] = useState<SlipStats>(EMPTY_SLIP_STATS);
  const [drillRecords, setDrillRecords] = useState<VarietyRecord[] | SlipRecord[]>([]);
  const [isPending, startTransition] = useTransition();

  // Prefetch background pages after stats load
  useEffect(() => {
    if (!stats) return;
    prefetchCache("farmers-list---", () => getFarmers({}).then((d) => d as any[]));
    prefetchCache("history-records---", () => getProcurementHistory({}));
    prefetchCache("history-summary-", () => getMonthlySummary());
  }, [stats]);

  // Click handlers
  const handleVarietyClick = useCallback((variety: string) => {
    setViewMode({ type: "variety", value: variety });
    setDrillRecords([]);
    startTransition(async () => {
      const detail = await getVarietyDetail(variety);
      setDrillStats(detail.stats);
      setDrillRecords(detail.records);
    });
  }, []);

  const handleTodayClick = useCallback(() => {
    setViewMode({ type: "today" });
    setDrillRecords([]);
    startTransition(async () => {
      const detail = await getTodayDetail();
      setDrillStats(detail.stats);
      setDrillRecords(detail.records);
    });
  }, []);

  const handleSlipsClick = useCallback(() => {
    setViewMode({ type: "slips" });
    setDrillRecords([]);
    startTransition(async () => {
      const detail = await getAllSlipsDetail();
      setDrillSlipStats(detail.slipStats);
      setDrillRecords(detail.records);
    });
  }, []);

  const handleTotalClick = useCallback(() => {
    router.push("/dashboard/history");
  }, [router]);

  const s = stats || EMPTY_STATS;
  const defaultVariety: VarietyStat[] = ["PB-1", "Pusa-1121", "Non Basmati", "Sarbati", "T.Basmati", "Type-3"]
    .map((v) => ({ variety: v, bags: 0, weightQtl: "0.00", value: "0.00", avgCost: "0.00" }));
  const varieties = varietyStats || defaultVariety;

  // ── DRILL-DOWN VIEWS ──────────────────────────────────────────
  if (viewMode.type !== "main") {
    let headerTitle = "";
    let headerSubtitle = "";
    let headerIcon = null;

    if (viewMode.type === "variety") {
      headerTitle = viewMode.value;
      headerSubtitle = "Variety drill-down";
      headerIcon = <Wheat size={16} className="text-forest-700" />;
    } else if (viewMode.type === "today") {
      headerTitle = "Today's Purchase";
      headerSubtitle = "Procurement records for today";
      headerIcon = <Calendar size={16} className="text-blue-700" />;
    } else if (viewMode.type === "slips") {
      headerTitle = "Purchase Slips";
      headerSubtitle = "All slips across statuses";
      headerIcon = <ClipboardList size={16} className="text-amber-700" />;
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode({ type: "main" })}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              viewMode.type === "variety" ? "bg-gradient-to-br from-forest-100 to-forest-200" :
              viewMode.type === "today" ? "bg-gradient-to-br from-blue-100 to-blue-200" :
              "bg-gradient-to-br from-amber-100 to-amber-200"
            }`}>
              {headerIcon}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight truncate">
                {headerTitle}
              </h1>
              <p className="text-xs text-slate-400">{headerSubtitle}</p>
            </div>
          </div>
          {isPending && <Loader2 size={16} className="animate-spin text-forest-500 ml-auto shrink-0" />}
        </div>

        {/* Filtered stats cards */}
        {viewMode.type === "slips" ? (
          <SlipStatsCards s={drillSlipStats} loading={isPending && drillRecords.length === 0} />
        ) : (
          <ThreeCards s={drillStats} loading={isPending && drillRecords.length === 0} hideTotalPurchase={viewMode.type === "today"} />
        )}

        {/* Records list */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Purchase Records</h2>
              <p className="text-xs text-slate-400">
                {drillRecords.length} record{drillRecords.length !== 1 && 's'}
              </p>
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
              <ClipboardList size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No records found</p>
              <p className="text-slate-300 text-xs mt-1">No procurement has been recorded for this view</p>
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
                      {'crop' in rec && rec.variety ? ` · ${rec.variety}` : ''}
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

      {/* 3 Info Cards (now clickable) */}
      <ThreeCards 
        s={s} 
        loading={isLoading && !stats} 
        onTodayClick={handleTodayClick}
        onSlipClick={handleSlipsClick}
        onTotalClick={handleTotalClick}
      />

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
